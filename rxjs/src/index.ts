import { WatchOptions as coreWatchOptions } from '@diffx/core/dist/watch-options';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import clone from './clone';
import { WatchOptions } from './watch-options';
import { take } from 'rxjs/operators';
import {
	setState as coreSetState,
	watchState as coreWatchState
} from '@diffx/core';

export { createState, setDiffxOptions, destroyState, diffxInternals } from '@diffx/core';

/**
 * Set state in diffx synchronously
 * @param reason The reason why the state changed
 * @param mutatorFunc A function that changes the state
 */
export function setState<ResolvedType>(reason: string, mutatorFunc: () => ResolvedType);
/**
 * Set state in diffx
 * @param reason The reason why the state changed
 * @param mutatorFunc A function (that can change the state and) returns an `Observable`
 * @param onDone Callback for when the observable returned from the mutatorFunc completes
 * @param onError Callback for when the observable returned from the mutatorFunc throws an error
 */
export function setState<ResolvedType, ErrorType = any>(
	reason: string,
	mutatorFunc: () => Observable<ResolvedType>,
	onDone?: (result: ResolvedType) => void,
	onError?: (error: ErrorType) => void
) {
	if (onDone) {
		coreSetState(
			reason,
			() => new Promise((resolve, reject) => {
				(mutatorFunc() as Observable<ResolvedType>)
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
	} else {
		coreSetState(reason, mutatorFunc);
	}
}

/**
 * Create an observable of the state
 * @param stateGetter A callback which should return the state to observe or an array of states to observe.
 * @param options Options for how the observer should behave
 */
export function observeState<T>(stateGetter: () => T, options?: WatchOptions<T>): Observable<T> {
	const eventStream = options?.emitInitialValue ? new Subject<T>() : new BehaviorSubject<T>(clone(stateGetter()));
	const coreConfig = { hasChangedComparer: options?.hasChangedComparer } as coreWatchOptions<T>;
	if (options?.emitOn === 'eachSetState') {
		coreConfig.onEachSetState = newValue => eventStream.next(newValue);
	} else if (options?.emitOn === 'eachValueUpdate') {
		coreConfig.onEachValueUpdate = newValue => eventStream.next(newValue);
	} else {
		coreConfig.onSetStateDone = newValue => eventStream.next(newValue);
	}
	const unwatch = coreWatchState(stateGetter, coreConfig);
	eventStream.unsubscribe = () => {
		unwatch();
		eventStream.unsubscribe();
	}
	return eventStream as Observable<T>;
}
