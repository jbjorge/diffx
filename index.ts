import { customRef, reactive, TrackOpTypes, TriggerOpTypes, watch } from "vue";
import { track, trigger } from '@vue/reactivity';
import { dateReviver, diff } from 'jsondiffpatch';

type Plugin = (propName, value, previousValue) => void;

const rootState = reactive({});
const diffs = [];

interface StateOptions {
	plugins?: Plugin[];
	debug?: boolean;
	setStateDirectly?: boolean;
}

type ReturnType<T> = T & { readonly $set: (reason: string, valueAssignment: () => void) => void }

let previousState = clone(rootState);

export function createState<T extends object>(namespace: string, state: T, options: StateOptions = {}): ReturnType<T> {
	if (rootState[namespace]) {
		throw new Error(`[stategate] The namespace ${namespace} is already in use by another module.`);
	}
	let isUsingSetMethod = false;
	rootState[namespace] = new Proxy(state, {
		get(target, prop, receiver) {
			if (prop === '$set') {
				return Reflect.get(target, prop, receiver);
			}
			track(target, TrackOpTypes.GET, prop);
			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'object') {
				return reactive(value);
			} else {
				return value;
			}
		},
		set(target, key, newValue, receiver) {
			if (key === '$set') {
				return Reflect.set(target, key, newValue, receiver);
			}
			const returnValue = Reflect.set(target, key, newValue, receiver);
			if (!isUsingSetMethod) {
				if (!options.setStateDirectly) {
					console.warn(
						'State was set directly instead of via the state.$set() method.',
						'This will make the history in the devtool less readable and disables tracing of who changed the state.',
						'To disable this warning, you can set options.setStateDirectly = true.',
						target, key, newValue
					);
				}
				createHistoryEntry('', options.debug);
			}
			trigger(target, TriggerOpTypes.SET, key, newValue);
			return returnValue;
		}
	})

	let previousState = clone(rootState);
	Object.defineProperty(rootState[namespace], '$set', {
		enumerable: false,
		writable: false,
		value: (reason, valueAssignment) => {
			if (typeof valueAssignment === 'function') {
				isUsingSetMethod = true;
				valueAssignment();
			}
			createHistoryEntry(reason, options.debug);
			isUsingSetMethod = false;
		}
	})

	return rootState[namespace];
}

function createHistoryEntry(reason = '', debug = false) {
	const currentState = clone(rootState);
	const historyEntry = {
		reason,
		diff: diff(previousState, currentState)
	};
	if (debug) {
		historyEntry['stackTrace'] = new Error().stack;
	}
	diffs.push(historyEntry);
	previousState = currentState;
}

function clone<T>(a: T): T {
	return JSON.parse(JSON.stringify(a, dateReviver));
}

export function getDiffs() {
	return diffs;
}