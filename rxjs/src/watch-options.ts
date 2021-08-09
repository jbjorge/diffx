export interface WatchOptions<T> {
	/**
	 * Whether to start with emitting the current value of the watched item(s).
	 *
	 * Default: `false`
	 */
	emitInitialValue?: boolean;
	/**
	 * Whether to emit each change to the state during .setState (eachValueUpdate),
	 * the current state after each .setState and .setState nested within it (eachSetState),
	 * or to only emit the final state after the outer .setState function has finished running (setStateDone).
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