import { effect, isRef, track, TrackOpTypes, trigger, TriggerOpTypes } from '@vue/reactivity';
import { dateReviver, Delta, diff } from 'jsondiffpatch';
import { isArray, isMap, isObject, isSet } from "@vue/shared";
import { BehaviorSubject, Subject } from 'rxjs';

type DiffListenerCallback = (diff: diffxInternals.DiffEntry, commit?: boolean) => void;
type DiffListeners = { [listenerId: string]: DiffListenerCallback }

let diffs: diffxInternals.DiffEntry[] = [];
const diffListeners: DiffListeners = {};
let isUsingSetFunction = false;
let stateModificationsLocked = false;
let isReplacingState = false;
let stateReplacementKey = null as number;
let stateModificationsPaused = false;
let isCreatingState = false;
let stateAccessBuffer = [] as (() => void)[];
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

/**
 * Set options for diffx
 * @param options
 */
export function setDiffxOptions(options: DiffxOptions) {
	diffxOptions = options;
	if (options?.debug?.devtools) {
		const glob = (typeof process !== 'undefined' && process?.versions?.node) ? global : window;
		glob["__DIFFX__"] = { createState, setState, watchState, destroyState, setDiffxOptions, ...diffxInternals };
	}
}

/**
 * Declare state in diffx.
 * @param namespace A string that identifies this state. Must be unique.
 * @param initialState
 */
export function createState<T extends object>(namespace: string, initialState: T): T {
	if (rootState[namespace]) {
		// todo Change this back to a throwing func
		console.warn(`[diffx] The namespace ${namespace} is already in use by another module. Using that module's state instead.`);
		return rootState[namespace];
	}
	isCreatingState = true;
	rootState[namespace] = initialState;
	isCreatingState = false;
	return rootState[namespace];
}

/**
 * Set state in diffx.
 * @param reason A text that specifies the reason for the change in state.
 * @param valueAssignment A callback in which all the changes to the state happens.
 */
export function setState(reason: string, valueAssignment: () => void) {
	if (stateModificationsLocked) {
		console.log(`State is paused, "${reason}" was not applied.`);
		return;
	}
	isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	runDelayedEmitter();
	isUsingSetFunction = false;
}

let delayedEmitter = () => {};
function runDelayedEmitter() {
	delayedEmitter();
	delayedEmitter = () => {};
}

interface WatchOptions<T> {
	/**
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: `true`
	 */
	lazy?: boolean;
	/**
	 * Whether to emit each change to the state during `.setState` or
	 * to only emit the final state after the `.setState` function has finished running.
	 *
	 * Default: `false`
	 */
	emitIntermediateChanges?: boolean;
	/**
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 */
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}

/**
 * Watch state for changes
 * @param stateGetter A callback which should return the state to watch or an array of states to watch.
 * @param onChangeCallback Will be called on every change to what stateGetter returned.
 * @param options
 */
export function watchState<T>(stateGetter: () => T, options?: WatchOptions<T>) {
	let oldValue;
	const getter = stateGetter;
	stateGetter = () => traverse(getter());
	oldValue = clone(getter());
	const eventStream = options?.lazy ? new Subject<T>() : new BehaviorSubject<T>(oldValue);
	const unwatch = effect<T>(stateGetter, {
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
			if (options?.emitIntermediateChanges) {
				eventStream.next(newValue);
			} else {
				delayedEmitter = () => eventStream.next(newValue);
			}
			oldValue = clone(newValue);
		}
	});
	eventStream.unsubscribe = () => {
		unwatch();
		eventStream.unsubscribe();
	}
	return eventStream;
}

export function watchStateLazy<T>(stateGetter: () => T, options?: Pick<WatchOptions<T>, 'emitIntermediateChanges' | 'hasChangedComparer'>) {
	return watchState(stateGetter, { ...options, lazy: true });
}

/**
 * Removes state from diffx.
 *
 * Watchers for the state that is removed will _not_ automatically unsubscribe.
 * @param namespace
 */
export function destroyState(namespace: string) {
	delete rootState[namespace];
}

export module diffxInternals {
	export interface DiffEntry {
		timestamp: number;
		reason: string;
		diff: Delta;
		stackTrace?: string;
	}

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
		stateAccessBuffer.forEach(trackOrTrigger => trackOrTrigger());
		stateAccessBuffer = [];
	}

	/**
	 * Disables changes to the state
	 */
	export function lockState() {
		stateModificationsLocked = true;
	}

	/**
	 * Enables changes to the state
	 */
	export function unlockState() {
		stateModificationsLocked = false;
	}

	/**
	 * Pauses changes to the state and buffers the changes
	 */
	export function pauseState() {
		stateModificationsPaused = true;
	}

	/**
	 * Unpauses changes to the state and applies all the changes
	 */
	export function unpauseState() {
		stateModificationsPaused = false;
		stateAccessBuffer.forEach(trackOrTrigger => trackOrTrigger());
		stateAccessBuffer = [];
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
function createReactiveObject<T extends object>(rootObj: T = {} as T) {
	return new Proxy(rootObj, {
		get(target, prop, receiver) {
			// If the state is being replaced, buffer the tracking of object access
			// so it can be run after the state is done being replaced
			if (isReplacingState || stateModificationsPaused) {
				stateAccessBuffer.push(() => track(target, TrackOpTypes.GET, prop));
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
			// Changes to the state can be paused.
			// This drops all attempts at changing it.
			const returnValue = Reflect.set(target, key, newValue, receiver);
			const isMutatingArray = (Array.isArray(target) && key === 'length');
			if (!isUsingSetFunction && !isCreatingState && !isReplacingState && !isMutatingArray) {
				throw new Error('[diffx] State was changed without using .setState()');
			}
			// If the state is being replaced, buffer the triggering of object setting
			// so it can be run after the state is done being replaced
			if (isReplacingState || stateModificationsPaused) {
				stateAccessBuffer.push(() => trigger(target, TriggerOpTypes.SET, key, newValue));
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
	const historyEntry: diffxInternals.DiffEntry = {
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
	return JSON.parse(JSON.stringify(obj), dateReviver);
}
