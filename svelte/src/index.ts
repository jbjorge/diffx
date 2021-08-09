import { watchState } from '@diffx/core';
import { WatchOptions } from '@diffx/core/dist/watch-options';

export {
	setDiffxOptions,
	createState,
	setState,
	watchState,
	destroyState,
	diffxInternals
} from '@diffx/core';

export interface UseDiffxWatchOptions<T> {
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
	hasChangedComparer: (newValue, oldValue) => boolean;
}

export function useDiffx<ValueType>(getterFunc: () => ValueType, options?: UseDiffxWatchOptions<ValueType>) {
	const _options: WatchOptions<ValueType> = {
		emitInitialValue: true,
		hasChangedComparer: options?.hasChangedComparer
	}
	return {
		subscribe: function(callback: any) {
			if (options?.emitOn === 'eachSetState') {
				_options.onEachSetState = callback;
			} else if (options?.emitOn === 'eachValueUpdate') {
				_options.onEachValueUpdate = callback;
			} else {
				_options.onSetStateDone = callback;
			}

			return watchState(getterFunc, _options);
		}
	}
}
