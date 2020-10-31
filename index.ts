import { customRef, reactive, TrackOpTypes, TriggerOpTypes, watch } from "vue";
import { track, trigger } from '@vue/reactivity';
import { dateReviver, diff } from 'jsondiffpatch';

type Plugin = (propName, value, previousValue) => void;

const rootState = reactive({});
const diffMap = {};

export function createState<T extends object>(namespace: string, state: T, plugins?: Plugin[]): T {
	if (rootState[namespace]) {
		throw new Error(`[stategate] The namespace ${namespace} has already been registered.`);
	}
	rootState[namespace] = reactive<T>(clone(state));
	diffMap[namespace] = [];
	let previousValue = clone(state);
	watch(
		() => rootState[namespace],
		(newValue) => {
			const newValueClone = clone(newValue);
			diffMap[namespace].push(diff(previousValue, newValueClone));
			console.log(JSON.stringify(diffMap[namespace], null, 2));
			previousValue = newValueClone;
		},
		{ deep: true }
	)
	// return readonly(rootState[stateName]);
	return rootState[namespace];
}

interface StateOptions {
	plugins?: Plugin[];
	debug?: boolean;
}

type ReturnType<T> = T & { $set: (prop: any, value: any, reason: string) => void };

export function mip<T extends object>(namespace: string, state: T, options: StateOptions = {}): ReturnType<T> {
	if (rootState[namespace]) {
		throw new Error(`[stategate] The namespace ${namespace} is already in use by another module.`);
	}
	diffMap[namespace] = [];
	let previousValue = clone(state);
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
			console.log(newValue);
			if (key === '$set') {
				return Reflect.set(target, key, newValue, receiver);
			}
			if (!newValue.reason || !newValue.value) {
				throw new Error('Tried setting the state without using .$set(...)');
			}
			const { reason, value, stackTrace } = newValue;
			const valueClone = clone(value);
			const historyEntry = {
				reason,
				diff: diff(previousValue, valueClone)
			};
			if (options.debug) {
				historyEntry['stackTrace'] = new Error().stack;
			}
			diffMap[namespace].push(historyEntry);
			previousValue = valueClone;
			trigger(target, TriggerOpTypes.SET, key, value);
			return Reflect.set(target, key, value, receiver);
		}
	})

	function $set(prop, value, reason) {
		console.log(prop, value, reason);
		// @ts-ignore
		prop = { value, reason };
	}
	rootState[namespace].$set = $set;
	return rootState[namespace];
}

// interface WatchOptions {
// 	immediate?: boolean;
// 	deep?: boolean;
// }
//
// export function watchState<T>(obj: T, callback: (newValue: T) => void, options: WatchOptions = {}) {
// 	return watch(() => obj, callback, options);
// }
//
// export function setState<T>(prop: T, value: any, reason?: string) {
// 	// const oldValue = clone(prop);
// 	// const newValue = clone(value);
// 	// const diffEntry = {
// 	// 	reason,
// 	// 	diff: diff(oldValue, newValue)
// 	// };
// 	// if (options.debug) {
// 	// 	diffEntry['stackTrace'] = new Error().stack;
// 	// }
// 	// diffMap[stateName].push(diffEntry);
// 	// prop = value;
// 	// return prop;
// }

function clone<T>(a: T): T {
	return JSON.parse(JSON.stringify(a, dateReviver));
}

// export function setState(obj: any, value: any, reason?: string) {
// 	if (!isReadonly(obj) || !isReactive(obj)) {
// 		throw new Error('Can not set state on an item that is not in the state.');
// 	}
// 	const state = toRaw(obj);
// }