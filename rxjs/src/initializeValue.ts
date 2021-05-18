import { isRef } from "@vue/reactivity"
import { isArray, isMap, isObject, isSet } from "@vue/shared"

export default function initializeValue(value: unknown, seen: Set<unknown> = new Set()) {
	if (!isObject(value) || seen.has(value)) {
		return value
	}
	seen.add(value)
	if (isRef(value)) {
		initializeValue(value.value, seen)
	} else if (isArray(value)) {
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
