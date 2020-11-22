import { effect, isRef, track, TrackOpTypes, trigger, TriggerOpTypes } from '@vue/reactivity';
import { dateReviver, Delta, diff } from 'jsondiffpatch';
import { isArray, isMap, isObject, isSet } from "@vue/shared";

interface DiffEntry {
	timestamp: number;
	reason: string;
	diff: Delta;
	stackTrace?: string;
}

type DiffListenerCallback = (diff: DiffEntry, commit?: boolean) => void;
type DiffListeners = { [listenerId: string]: DiffListenerCallback }

let diffs: DiffEntry[] = [];
const diffListeners: DiffListeners = {};
let isUsingSetFunction = false;
let stateModificationsPaused = false;
let isReplacingState = false;
let stateReplacementKey = null as number;
let isCreatingState = false;
let reactionsBuffer = [] as (() => void)[];
let rootState = createReactiveObject();
let previousState = clone(rootState);

/**
 * Set options for the diffx runtime
 */
interface DiffxOptions {
	debug?: {
		/** Enable viewing the state history in devtools. Not recommended for use in a production environment. */
		devtools?: boolean;
		/** Beware, creating stack traces for each state change is slow. Not recommended for use in a production environment. */
		includeStackTrace?: boolean;
	},
	allowAnonymousStateChange?: boolean;
}
let diffxOptions: DiffxOptions = {
	allowAnonymousStateChange: false
}

export function setDiffxOptions(options: DiffxOptions) {
	diffxOptions = options;
	if (options?.debug?.devtools) {
		const glob = (typeof process !== 'undefined' && process?.versions?.node) ? global : window;
		glob["__DIFFX__"] = { createState, setState, watchState, destroyState, setDiffxOptions, ...diffxInternals };
	}
}

export function createState<T extends object>(namespace: string, state: T): T {
	if (rootState[namespace]) {
		throw new Error(`[diffx] The namespace ${namespace} is already in use by another module.`);
	}
	isCreatingState = true;
	rootState[namespace] = state;
	isCreatingState = false;
	return rootState[namespace];
}

export function setState(reason: string, valueAssignment: () => void) {
	if (stateModificationsPaused) {
		return;
	}
	isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	isUsingSetFunction = false;
}

interface WatchOptions<T> {
	immediate?: boolean;
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}
export function watchState<T>(stateGetter: () => T, onChangeCallback: (newValue: T) => void, options?: WatchOptions<T>) {
	let oldValue;
	const getter = stateGetter;
	stateGetter = () => traverse(getter());
	if (options?.immediate) {
		oldValue = clone(getter());
		onChangeCallback(oldValue);
	}
	return effect<T>(stateGetter, {
		lazy: false,
		onTrigger: (event) => {
			const newValue = getter();
			const newValueString = JSON.stringify(newValue);
			const newValueClone = newValueString === undefined ? undefined : JSON.parse(newValueString);
			if (newValueString === JSON.stringify(oldValue)) {
				return;
			}
			if (options?.hasChangedComparer && !options.hasChangedComparer(newValueClone, oldValue)) {
				oldValue = newValueClone === undefined ? undefined : clone(newValue);
				return;
			}
			onChangeCallback(newValue);
			oldValue = clone(newValue);
		}
	});
}

export function destroyState(namespace: string) {
	delete rootState[namespace];
}

export module diffxInternals {
	let diffListenerId = 0;

	/**
	 * Adds a callback that will get called with the diff of the state on each state change
	 * @param cb		Callback
	 * @param lazy	If true, will only call the callback from this point on. Setting it to false/omitted it will call the
	 * 							callback with all previous diffs as well.
	 * @returns Function that will unsubscribe upon being called
	 */
	export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean): () => void {
		const listenerId = diffListenerId++;
		diffListeners[listenerId] = cb;
		if (!lazy) {
			diffs.forEach(diff => cb(diff));
		}
		return () => removeDiffListener(listenerId);
	}

	/**
	 * Removes diff listener
	 * @param listenerId
	 */
	function removeDiffListener(listenerId: number) {
		delete diffListeners[listenerId];
	}

	/**
	 * Combines all diffs into one diff before continuing as normal
	 */
	export function commit() {
		const diffEntry: DiffEntry = {
			timestamp: Date.now(),
			reason: 'Commit',
			diff: diff({}, clone(rootState))
		};
		diffs = [diffEntry];
		for (let cbId in diffListeners) {
			diffListeners[cbId](diffEntry, true);
		}
	}

	/**
	 * Replaces the current state.
	 * Needs to be provided the `rootState`, e.g. like the one returned from `getStateSnapshot()`.
	 * @param state
	 */
	export function replaceState(state): void {
		isReplacingState = true;
		stateReplacementKey = Math.random();
		for (let namespace in rootState) {
			for (let propName in rootState[namespace]) {
				if (state[namespace] === undefined || state[namespace][propName] === undefined) {
					rootState[namespace][propName] = undefined;
					delete rootState[namespace][propName];
				}
			}
			if (!state[namespace]) {
				delete rootState[namespace];
			}
		}
		for (let namespace in state) {
			for (let propName in state[namespace]) {
				rootState[namespace][propName] = {
					__diffx_stateReplacementKey: stateReplacementKey,
					__diffx_stateReplacementValue: state[namespace][propName]
				};
			}
		}
		isReplacingState = false;
		stateReplacementKey = null;
		reactionsBuffer.forEach(reaction => reaction());
		reactionsBuffer = [];
	}

	/**
	 * Disables changes to the state
	 */
	export function lockState() {
		stateModificationsPaused = true;
	}

	/**
	 * Enables changes to the state
	 */
	export function unlockState() {
		stateModificationsPaused = false;
	}

	/**
	 * Gets a snapshot of the current state
	 */
	export function getStateSnapshot() {
		return clone(rootState);
	}

	/**
	 * Gets all diffs that have been recorded this far
	 */
	export function getDiffs() {
		return diffs;
	}
}

/**
 * Creates a reactive object.
 * @param rootObj
 */
function createReactiveObject<T extends object>(rootObj:T  = {} as T) {
	return new Proxy(rootObj, {
		get(target, prop, receiver) {
			// If the state is being replaced, buffer the tracking of object access
			// so it can be run after the state is done being replaced
			if (isReplacingState) {
				reactionsBuffer.push(() => track(target, TrackOpTypes.GET, prop));
			} else {
				track(target, TrackOpTypes.GET, prop);
			}
			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'object') {
				return createReactiveObject(value);
			} else {
				return value;
			}
		},
		set(target, key, newValue, receiver) {
			// Changes to the state can be paused.
			// This drops all attempts at changing it.
			if (stateModificationsPaused) {
				return true;
			}
			// If the state is being replaced, drop all changes
			// to the state not done by the replacement process itself.
			// This protects from potential watchers reacting to the state change
			// as it is happening and trying to change the state further.
			if (isReplacingState) {
				if (newValue?.__diffx_stateReplacementKey !== stateReplacementKey) {
					return true;
				}
				newValue = newValue.__diffx_stateReplacementValue;
			}
			const returnValue = Reflect.set(target, key, newValue, receiver);
			if (!isUsingSetFunction && !isCreatingState && !isReplacingState) {
				if (!diffxOptions.allowAnonymousStateChange) {
					console.warn(
						'[diffx] State was set directly instead of via the setState() function.\n',
						'This will make the history in the devtool less readable since it does not display why the state was changed.\n',
						'To disable this warning, set stateOptions.allowAnonymousStateChange = true.\n',
						new Error().stack
					);
				}
				createHistoryEntry('');
			}
			// If the state is being replaced, buffer the triggering of object setting
			// so it can be run after the state is done being replaced
			if (isReplacingState) {
				reactionsBuffer.push(() => trigger(target, TriggerOpTypes.SET, key, newValue));
			} else {
				trigger(target, TriggerOpTypes.SET, key, newValue);
			}
			return returnValue;
		}
	});
}

/**
 * Creates a diff of the previous and current state and stores it in the
 * diff entries.
 * @param reason The reason for the change
 */
function createHistoryEntry(reason = '') {
	if (!diffxOptions.debug) {
		return;
	}
	const currentState = clone(rootState);
	const historyEntry: DiffEntry = {
		timestamp: Date.now(),
		reason,
		diff: diff(previousState, currentState)
	};
	if (diffxOptions?.debug?.includeStackTrace) {
		historyEntry.stackTrace = new Error().stack.split('\n').slice(3).join('\n');
	}
	diffs.push(historyEntry);
	for (let cbId in diffListeners) {
		diffListeners[cbId](historyEntry);
	}
	previousState = currentState;
}

function traverse(value: unknown, seen: Set<unknown> = new Set()) {
	if (!isObject(value) || seen.has(value)) {
		return value
	}
	seen.add(value)
	if (isRef(value)) {
		traverse(value.value, seen)
	} else if (isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			traverse(value[i], seen)
		}
	} else if (isSet(value) || isMap(value)) {
		value.forEach((v: any) => {
			traverse(v, seen)
		})
	} else {
		for (const key in value) {
			traverse(value[key], seen)
		}
	}
	return value
}

function clone<T>(obj: T): T {
	if (obj === undefined) {
		return;
	}
	return JSON.parse(JSON.stringify(obj, dateReviver));
}
