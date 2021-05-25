export interface WatchOptions<T> {
	/**
	 * Whether to emit the current value of the watched item(s).
	 *
	 * Default: `false`
	 */
	lazy?: boolean;
	/**
	 * Whether to emit each change to the state during `.setState` or
	 * to only emit the final state after the `.setState` function has finished running.
	 *
	 * Default: `false`
	 */
	emitIntermediateChanges?: boolean;
	/**
	 * Custom comparer function to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 */
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}