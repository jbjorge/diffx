import { useEffect, useState } from 'react';
import { setState, watchState } from '@diffx/core';

export { createState, setState, destroyState, setDiffxOptions, watchState } from '@diffx/core';

type StateGetter<T> = () => T;
type StateSetter<T> = (value: T) => void;

/**
 * Access diffx state using a react hook
 */
export function useDiffx<T>(getter: StateGetter<T>): T;
export function useDiffx<T>(getter: StateGetter<T>, setter: StateSetter<T>): [T, (reason: string, newValue: T) => void, typeof setState]
export function useDiffx<T>(getter: StateGetter<T>, setter?: StateSetter<T>) {
	const [state, changeState] = useState(getter());

	useEffect(() => {
		function updateState(value) {
			const newValue = value == null ? value : JSON.parse(JSON.stringify(value));
			changeState(newValue);
		}

		return watchState(getter, { lazy: true, onChanged: updateState });
	});

	function setSelectedState(reason, newValue) {
		setState(reason, setter.bind(null, newValue));
	}

	return setter ? [state, setSelectedState, setState] : state;
}
