import { watchState as coreWatchState } from '@diffx/core';
import { WatchOptions as coreWatchOptions } from '@diffx/core/dist/watch-options';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import clone from './clone';
import { WatchOptions } from './watch-options';

export { setState, createState, setDiffxOptions, destroyState } from '@diffx/core';

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
