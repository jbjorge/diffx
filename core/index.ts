import { effect, isRef, reactive, track, TrackOpTypes, trigger, TriggerOpTypes } from '@vue/reactivity';
import { dateReviver, Delta, diff } from 'jsondiffpatch';
import { isArray, isMap, isObject, isSet } from "@vue/shared";

type Plugin = (propName, value, previousValue) => void;

interface StateOptions {
	plugins?: Plugin[];
}

export interface DiffEntry {
	timestamp: number;
	reason: string;
	diff: Delta;
	stackTrace?: string;
}

interface WatchOptions<T> {
	immediate?: boolean;
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}

type DiffListenerCallback = (diff: DiffEntry, commit?: boolean) => void;
type DiffListeners = { [listenerId: string]: DiffListenerCallback }

let diffs: DiffEntry[] = [];
const diffListeners: DiffListeners = {};
const rootState = reactive({});
let previousState = clone(rootState);
let isUsingSetFunction = false;
let statePaused = false;

export const stateOptions = {
	debug: false,
	stackTrace: false,
	devtools: false,
	allowAnonymousStateChange: false
}

export function createState<T extends object>(namespace: string, state: T): T {
	if (rootState[namespace]) {
		throw new Error(`[stategate] The namespace ${namespace} is already in use by another module.`);
	}
	rootState[namespace] = new Proxy(state, {
		get(target, prop, receiver) {
			track(target, TrackOpTypes.GET, prop);
			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'object') {
				return reactive(value);
			} else {
				return value;
			}
		},
		set(target, key, newValue, receiver) {
			if (statePaused) {
				return true;
			}
			const returnValue = Reflect.set(target, key, newValue, receiver);
			if (!isUsingSetFunction) {
				if (!stateOptions.allowAnonymousStateChange) {
					console.warn(
						'[stategate] State was set directly instead of via the setState() function.\n',
						'This will make the history in the devtool less readable since it does not display why the state was changed.\n',
						'To disable this warning, set stateOptions.allowAnonymousStateChange = true.\n',
						new Error().stack
					);
				}
				createHistoryEntry('');
			}
			trigger(target, TriggerOpTypes.SET, key, newValue);
			return returnValue;
		}
	});

	return rootState[namespace];
}

export function setState(reason: string, valueAssignment: () => void) {
	if (statePaused) {
		return;
	}
	isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	isUsingSetFunction = false;
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
			const newValueClone = JSON.parse(newValueString);
			if (newValueString === JSON.stringify(oldValue)) {
				return;
			}
			if (options?.hasChangedComparer && !options.hasChangedComparer(newValueClone, oldValue)) {
				oldValue = clone(newValue);
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

// DEVTOOLS
let diffListenerId = 0;
export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean) {
	const listenerId = diffListenerId++;
	diffListeners[listenerId] = cb;
	if (!lazy) {
		diffs.forEach(diff => cb(diff));
	}
	return () => removeDiffListener(listenerId);
}

function removeDiffListener(listenerId: number) {
	delete diffListeners[listenerId];
}

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

export function replaceState(): void {
	// not implemented
}

export function pauseState(): void {
	statePaused = true;
}

export function unPauseState(): void {
	statePaused = false;
}

export function getStateSnapshot() {
	return clone(rootState);
}

export function getDiffs() {
	return diffs;
}

function createHistoryEntry(reason = '') {
	if (!stateOptions.debug) {
		return;
	}
	const currentState = clone(rootState);
	const historyEntry: DiffEntry = {
		timestamp: Date.now(),
		reason,
		diff: diff(previousState, currentState)
	};
	if (stateOptions.stackTrace) {
		historyEntry.stackTrace = new Error().stack.split('\n').slice(3).join('\n');
	}
	diffs.push(historyEntry);
	for (let cbId in diffListeners) {
		diffListeners[cbId](historyEntry);
	}
	previousState = currentState;
}

// UTILS
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
	return JSON.parse(JSON.stringify(obj, dateReviver));
}