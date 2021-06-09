import { setStateAsync as coreSetStateAsync, watchState as coreWatchState } from '@diffx/core';
import { WatchOptions as coreWatchOptions } from '@diffx/core/dist/watch-options';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import clone from './clone';
import { WatchOptions } from './watch-options';
import { take } from 'rxjs/operators';

export { createState, setDiffxOptions, destroyState, diffxInternals, setState } from '@diffx/core';

/**
 * Set state in diffx asynchronously.
 * @param reason The reason why the state changed
 * @param asyncMutatorFunc A function (that can change the state and) returns an `Observable`
 * @param onDone A mutatorFunc for when the asyncMutatorFunc has finished successfully.
 * @param onError A mutatorFunc for when the asyncMutatorFunc has encountered an error.
 */
export function setStateAsync<ResolvedType, ErrorType = any>(
	reason: string,
	asyncMutatorFunc: () => Observable<ResolvedType>,
	onDone: (result: ResolvedType) => void,
	onError?: (error: ErrorType) => void
) {
	coreSetStateAsync(
		reason,
		() => new Promise((resolve, reject) => {
			asyncMutatorFunc()
				.pipe(take(1))
				.subscribe({
					next(value) { resolve(value) },
					error(err) { reject(err as ErrorType) },
					complete() {}
				});
		}),
		onDone,
		onError
	);
}

/**
 * Watch state for changes
 * @param stateGetter A callback which should return the state to watch or an array of states to watch.
 * @param options Options for how the watcher should behave
 */
export function watchState<T>(stateGetter: () => T, options?: WatchOptions<T>): Observable<T> {
	const eventStream = options?.lazy ? new Subject<T>() : new BehaviorSubject<T>(clone(stateGetter()));
	const coreConfig = { hasChangedComparer: options?.hasChangedComparer } as coreWatchOptions<T>;
	if (options?.emitIntermediateChanges) {
		coreConfig.onEachChange = newValue => eventStream.next(newValue);
	} else {
		coreConfig.onChanged = newValue => eventStream.next(newValue);
	}
	const unwatch = coreWatchState(stateGetter, coreConfig);
	eventStream.unsubscribe = () => {
		unwatch();
		eventStream.unsubscribe();
	}
	return eventStream as Observable<T>;
}
