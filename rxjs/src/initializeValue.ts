import { isRef } from "@vue/reactivity"

const objectToString = Object.prototype.toString;
const toTypeString = (value) => objectToString.call(value);
const isMap = (val) => toTypeString(val) === '[object Map]';
const isSet = (val) => toTypeString(val) === '[object Set]';
const isObject = (val) => val !== null && typeof val === 'object';

export default function initializeValue(value: any, seen: Set<any> = new Set()) {
	if (!isObject(value) || seen.has(value)) {
		return value
	}
	seen.add(value)
	if (isRef(value)) {
		initializeValue(value.value, seen)
	} else if (Array.isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			initializeValue(value[i], seen)
		}
	} else if (isSet(value) || isMap(value)) {
		value.forEach((v: any) => {
			initializeValue(v, seen)
		})
	} else {
		for (const key in value) {
			initializeValue(value[key], seen)
		}
	}
	return value
}
