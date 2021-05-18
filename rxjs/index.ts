import { effect } from '@vue/reactivity';
import { BehaviorSubject, Subject } from 'rxjs';
import initializeValue from './utils/initializeValue';
import { createHistoryEntry } from './utils/createHistoryEntry';
import internalState, { DiffxOptions } from './utils/internal-state';
import { WatchOptions } from './utils/watch-options';
import clone from './utils/clone';
import rootState from './utils/root-state';
import { diffxInternals } from 'utils/internals';

/**
 * Set options for diffx
 * @param options
 */
export function setDiffxOptions(options: DiffxOptions) {
	internalState.instanceOptions = options;
	if (options?.debug?.devtools) {
		const glob = (typeof process !== 'undefined' && process?.versions?.node) ? global : window;
		glob["__DIFFX__"] = { createState, setState, watchState, destroyState, setDiffxOptions, ...diffxInternals };
	}
}

/**
 * Declare state in diffx.
 * @param namespace A string that identifies this state. Must be unique.
 * @param initialState
 */
export function createState<T extends object>(namespace: string, initialState: T): T {
	if (rootState[namespace]) {
		if (internalState?.instanceOptions?.debug?.devtools) {
			console.warn(`[diffx] The namespace ${namespace} is already in use by another module. THIS WILL THROW AN ERROR IN PRODUCTION ENVIRONMENTS.`);
		} else {
			throw new Error(`[diffx] The namespace ${namespace} is already in use. Namespaces must be unique.`);
		}
	}
	internalState.isCreatingState = true;
	rootState[namespace] = initialState;
	internalState.isCreatingState = false;
	return rootState[namespace];
}

/**
 * Set state in diffx.
 * @param reason A text that specifies the reason for the change in state.
 * @param valueAssignment A callback in which all the changes to the state happens.
 */
export function setState(reason: string, valueAssignment: () => void) {
	if (internalState.stateModificationsLocked) {
		console.log(`State is paused, skipped processing of "${reason}".`);
		return;
	}
	internalState.isUsingSetFunction = true;
	valueAssignment();
	createHistoryEntry(reason);
	runDelayedEmitter();
	internalState.isUsingSetFunction = false;
}

/**
 * Watch state for changes
 * @param stateGetter A callback which should return the state to watch or an array of states to watch.
 * @param onChangeCallback Will be called on every change to what stateGetter returned.
 * @param options
 */
export function watchState<T>(stateGetter: () => T, options?: WatchOptions<T>) {
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
				delayedEmitter = () => eventStream.next(newValue);
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

/**
 * Used for emitting the final state instead
 * of emitting intermittent state changes during
 * `.setState()`.
 */
let delayedEmitter = () => {};
function runDelayedEmitter() {
	delayedEmitter();
	delayedEmitter = () => {
	};
}