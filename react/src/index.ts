import { useEffect, useState } from 'react';
import { setState, watchState } from '@diffx/core';

export { createState, setState, destroyState, setDiffxOptions, watchState } from '@diffx/core';

type StateGetter<StateType> = () => StateType;

/**
 * Access diffx state using a react hook
 */
export function useDiffx<StateType>(getter: StateGetter<StateType>): StateType {
	const [state, changeState] = useState(getter());

	useEffect(() => {
		function updateState(value) {
			const newValue = value == null ? value : JSON.parse(JSON.stringify(value));
			changeState(newValue);
		}

		return watchState(getter, { lazy: true, onChanged: updateState });
	});

	return state;
}
