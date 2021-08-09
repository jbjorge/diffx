export type WatcherCallback<T> = (newValue: T, oldValue?: T | undefined) => void;

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
	onEachSetState?: WatcherCallback<T>;
	/**
	 * Callback called with the final state after the `.setState` function has finished running.
	 */
	onSetStateDone?: WatcherCallback<T>;
	/**
	 * Callback for each change to the state during `.setState`.
	 */
	onEachValueUpdate?: WatcherCallback<T>;
	/**
	 * Custom comparer function which can be used instead of the build in to decide if the state has changed.
	 * Receives newValue and oldValue as arguments and should return `true` for changed
	 * and `false` for no change.
	 *
	 * Default: Diffx built in comparer
	 */
	hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
	/**
	 * Whether the watcher should automatically stop watching after the first changed value has
	 * been emitted.
	 *
	 * Default: false
	 */
	once?: boolean;
}