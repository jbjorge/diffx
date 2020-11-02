import { track, trigger, TrackOpTypes, TriggerOpTypes, reactive, effect, ReactiveEffectOptions } from '@vue/reactivity';
import { dateReviver, diff, Delta } from 'jsondiffpatch';
import { watch } from "./src/watsj";
import { stateOptions as _stateOptions } from './src/state-options';

type Plugin = (propName, value, previousValue) => void;
interface StateOptions {
	plugins?: Plugin[];
}

interface DiffEntry {
	timestamp: number;
	reason: string;
	diff: Delta;
	stackTrace?: string;
}

interface WatchOptions {
	immediate?: boolean;
	deep?: boolean;
	debounceUpdates?: boolean;
}

const rootState = reactive({});
const diffs: DiffEntry[] = [];
let previousState = clone(rootState);
let isUsingSetFunction = false;

export const stateOptions = _stateOptions;

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
			const returnValue = Reflect.set(target, key, newValue, receiver);
			if (!isUsingSetFunction) {
				if (!_stateOptions.setStateDirectly) {
					console.warn(
						'[stategate] State was set directly instead of via the state.$set() method.\n',
						'This will make the history in the devtool less readable and disables tracing of who changed the state.\n',
						'To disable this warning, you can set options.setStateDirectly = true.\n',
						new Error().stack
					);
				}
				createHistoryEntry('');
			}
			trigger(target, TriggerOpTypes.SET, key, newValue);
			return returnValue;
		}
	})

	return rootState[namespace];
}

export function setState(reason: string, valueAssignment: () => void) {
	isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	isUsingSetFunction = false;
}

export function watchState<T>(state: () => T, cb: (newValue: T) => void, options: WatchOptions) {
	return watch(state, cb, {
		immediate: options.immediate,
		deep: options.deep,
		flush: options.debounceUpdates ? 'pre' : 'sync'
	});
}

function createHistoryEntry(reason = '') {
	if (!_stateOptions.debug) {
		return;
	}
	const currentState = clone(rootState);
	const historyEntry: DiffEntry = {
		timestamp: Date.now(),
		reason,
		diff: diff(previousState, currentState)
	};
	if (_stateOptions.stackTrace) {
		historyEntry.stackTrace = new Error().stack;
	}
	diffs.push(historyEntry);
	previousState = currentState;
}

export function getDiffs() {
	return diffs;
}

function clone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj, dateReviver));
}