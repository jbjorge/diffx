import { effect, isRef, reactive, toRaw } from '@vue/reactivity';
import { dateReviver, Delta, diff } from 'jsondiffpatch';
import { isArray, isMap, isObject, isSet } from "@vue/shared";
import { v4 as uuid } from 'uuid';

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

watchState(
	() => rootState,
	() => {
		if (!isUsingSetFunction) {
			if (!stateOptions.setStateDirectly) {
				console.warn(
					'[stategate] State was set directly instead of via the setState function.\n',
					'This will make the history in the devtool less readable and disables tracing of who changed the state.\n',
					'To disable this warning, you can set options.setStateDirectly = true.\n',
					new Error().stack
				);
			}
			createHistoryEntry('');
		}
	}
)

export const stateOptions = {
	debug: false,
	stackTrace: false,
	devtools: false,
	setStateDirectly: false
}

export function createState<T extends object>(namespace: string, state: T): T {
	if (rootState[namespace]) {
		throw new Error(`[stategate] The namespace ${namespace} is already in use by another module.`);
	}
	setState(`${namespace} initialized`, () => {
		rootState[namespace] = reactive(state);
	});
	return rootState[namespace];
}

export function destroyState(namespace: string) {
	delete rootState[namespace];
}

let changeCallbacks: { [callbackId: string]: (() => void) } = {};
export function setState(reason: string, valueAssignment: () => void) {
	isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	if (Object.keys(changeCallbacks)) {
		for (let cbId in changeCallbacks) {
			changeCallbacks[cbId]();
		}
	}
	changeCallbacks = {};
	isUsingSetFunction = false;
}

export function watchState<T>(stateGetter: () => T, onChangeCallback: (newValue: T) => void, options?: WatchOptions<T>) {
	const watchId: string = uuid();
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
			if (JSON.stringify(newValue) === JSON.stringify(oldValue)) {
				return;
			}
			if (options?.hasChangedComparer && !options.hasChangedComparer(newValue, oldValue)) {
				oldValue = clone(newValue);
				return;
			}
			if (isUsingSetFunction) {
				changeCallbacks[watchId] = () => onChangeCallback(newValue);
			} else {
				onChangeCallback(newValue);
			}
			oldValue = clone(newValue);
		}
	});
}

export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean) {
	const listenerId = uuid();
	diffListeners[listenerId] = cb;
	if (!lazy) {
		diffs.forEach(diff => cb(diff));
	}
	return () => removeDiffListener(listenerId);
}

function removeDiffListener(listenerId: string) {
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