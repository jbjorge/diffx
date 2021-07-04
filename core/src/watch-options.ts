export interface WatchOptions<T> {
	/**
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: `false`
	 */
	emitInitialValue?: boolean;
	/**
	 * Callback called with the current state after each `.setState` has finished running
	 * (including each .setState wrapped in .setState)
	 *
	 * This is most likely the callback you want to use instead of `onSetStateDone` and `onEachValueUpdate`.
	 */
	onEachSetState?: (newValue: T, oldValue?: T | undefined) => void;
	/**
	 * Callback called with the final state after the `.setState` function has finished running.
	 */
	onSetStateDone?: (newValue: T, oldValue?: T | undefined) => void;
	/**
	 * Callback for each change to the state during `.setState`.
	 */
	onEachValueUpdate?: (newValue: T, oldValue?: T | undefined) => void;
	/**
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 */
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}