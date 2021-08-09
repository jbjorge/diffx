import { useEffect, useState } from 'react';
import { setState, watchState } from '@diffx/core';
import { WatchOptions } from '@diffx/core/dist/watch-options';

export {
	setDiffxOptions,
	createState,
	setState,
	watchState,
	destroyState,
	diffxInternals
} from '@diffx/core';

type StateGetter<StateType> = () => StateType;

export interface UseDiffxOptions<T> {
	/**
	 * Whether to start with emitting the current value of the getter.
	 *
	 * Default: `true`
	 */
	emitInitialValue?: boolean;
	/**
	 * Whether to emit each change to the state during .setState (eachValueUpdate),
	 * the current state after each .setState and .setState nested within it (eachSetState),
	 * or to only emit the final state after the outer .setState function has finished running (setStateDone).
	 *
	 * This can be used to optimize rendering if there e.g. is a need to render every value as it updates in Diffx.
	 *
	 * Default: `setStateDone`
	 */
	emitOn: 'eachSetState' | 'setStateDone' | 'eachValueUpdate';
	/**
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 */
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}

/**
 * Access diffx state using a react hook
 */
export function useDiffx<StateType>(getter: StateGetter<StateType>, options?: UseDiffxOptions<StateType>): StateType {
	const [state, changeState] = useState(getter());

	useEffect(() => {
		function updateState(value) {
			const newValue = value == null ? value : JSON.parse(JSON.stringify(value));
			changeState(newValue);
		}

		const _options: WatchOptions<StateType> = {
			emitInitialValue: !!options?.emitInitialValue,
			hasChangedComparer: options?.hasChangedComparer
		};

		if (options?.emitOn === 'eachSetState') {
			_options.onEachSetState = updateState;
		} else if (options?.emitOn === 'eachValueUpdate') {
			_options.onEachValueUpdate = updateState;
		} else {
			_options.onSetStateDone = updateState;
		}

		return watchState(getter, _options);
	}, []);

	return state;
}
