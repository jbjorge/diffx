export interface WatchOptions<T> {
	/**
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: `false`
	 */
	lazy?: boolean;
	/**
	 * Callback called with the final state after the `.setState` function has finished running.
	 */
	onChanged?: (newValue: T) => void;
	/**
	 * Callback for each change to the state during `.setState`.
	 */
	onEachChange?: (newValue: T) => void;
	/**
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 */
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}