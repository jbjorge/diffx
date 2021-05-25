import { effect } from '@vue/reactivity';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import initializeValue from './initializeValue';
import { createHistoryEntry } from './createHistoryEntry';
import internalState, { DiffxOptions } from './internal-state';
import { WatchOptions } from './watch-options';
import clone from './clone';
import rootState from './root-state';
import * as internals from './internals';
import { v4 as uuid } from 'uuid';
import runDelayedEmitters from './runDelayedEmitters';

export const diffxInternals = internals;

/**
 * Set options for diffx
 * @param options
 */
export function setDiffxOptions(options: DiffxOptions) {
	internalState.instanceOptions = options;
	if (options?.debug?.devtools) {
		const glob = (typeof process !== 'undefined' && process?.versions?.node) ? global : window;
		glob["__DIFFX__"] = { createState, setState, watchState, destroyState, setDiffxOptions, ...internals };
	}
}

/**
 * Declare state in diffx.
 * @param namespace A string that identifies this state. Must be unique.
 * @param initialState
 */
export function createState<T extends object>(namespace: string, initialState: T): T {
	if (rootState[namespace]) {
		console.warn(`[diffx] The namespace ${namespace} is already in use. Returning its current state.`);
		if (internalState?.instanceOptions?.debug?.devtools) {
			console.warn(`[diffx] The namespace ${namespace} is already in use by another module.\nThis could be due to hot-module-replacement reloading the page during development.\nThis will throw an error in production environments.`);
		} else {
			throw new Error(`[diffx] The namespace ${namespace} is already in use. Namespaces must be unique.`);
		}
	}
	internalState.isCreatingState = true;
	rootState[namespace] = initialState;
	internalState.isCreatingState = false;
	createHistoryEntry(`@init ${namespace}`, true);
	return rootState[namespace];
}

/**
 * Set state in diffx.
 * @param reason A text that specifies the reason for the change in state.
 * @param valueAssignment A callback in which all the changes to the state happens.
 */
export function setState(reason: string, valueAssignment: () => void) {
	if (internalState.stateModificationsLocked) {
		console.log(`[diffx] State is paused, skipped processing of "${reason}".`);
		return;
	}
	internalState.isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	runDelayedEmitters();
	internalState.isUsingSetFunction = false;
}

/**
 * Watch state for changes
 * @param stateGetter A callback which should return the state to watch or an array of states to watch.
 * @param options Options for how to watch the state
 */
export function watchState<T>(stateGetter: () => T, options?: WatchOptions<T>): Observable<T> {
	const watchId = uuid();
	let oldValue;
	const getter = stateGetter;
	stateGetter = () => initializeValue(getter());
	oldValue = clone(getter());
	const eventStream = options?.lazy ? new Subject<T>() : new BehaviorSubject<T>(oldValue);
	const unwatch = effect<T>(stateGetter, {
		lazy: false,
		onTrigger: (event) => {
			const newValue = getter();
			const newValueString = JSON.stringify(newValue);
			const newValueClone = newValueString === undefined ? undefined : JSON.parse(newValueString);
			if (newValueString === JSON.stringify(oldValue)) {
				return;
			}
			if (options?.hasChangedComparer && !options.hasChangedComparer(newValueClone, oldValue)) {
				oldValue = newValueClone === undefined ? undefined : clone(newValue);
				return;
			}
			if (options?.emitIntermediateChanges) {
				eventStream.next(newValue);
			} else {
				internalState.delayedEmitters[watchId] = () => eventStream.next(newValue);
			}
			oldValue = clone(newValue);
		}
	});
	eventStream.unsubscribe = () => {
		unwatch();
		eventStream.unsubscribe();
	}
	return eventStream;
}

/**
 * Removes state from diffx.
 *
 * Watchers for the state that is removed will _not_ automatically unsubscribe.
 * @param namespace
 */
export function destroyState(namespace: string) {
	delete rootState[namespace];
}
