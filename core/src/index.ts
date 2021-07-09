import initializeValue from './initializeValue';
import { createHistoryEntry } from './createHistoryEntry';
import internalState, { CreateStateOptions, DiffxOptions } from './internal-state';
import { WatchOptions } from './watch-options';
import clone from './clone';
import rootState from './root-state';
import * as internals from './internals';
import { getStateSnapshot, replaceState } from './internals';
import { effect } from '@vue/reactivity';
import { getInitialState } from './initial-state';
import { _setState, _setStateAsync } from './setState';
import { duplicateNamespace, missingWatchCallbacks, replacingStateForNamespace } from './console-messages';

export * as diffxInternals from './internals';

/**
 * Set options for diffx
 * @param options
 */
export function setDiffxOptions(options: DiffxOptions) {
	internalState.instanceOptions = { ...internalState.instanceOptions, ...options };
	if (internalState.instanceOptions?.devtools) {
		const glob = (typeof process !== 'undefined' && process?.versions?.node) ? global : window;
		glob["__DIFFX__"] = { createState, setState, watchState, destroyState, setDiffxOptions, ...internals };
	}
}

/**
 * Declare state in diffx.
 * @param namespace A string that identifies this state. Must be unique.
 * @param initialState An object that contains the initial state.
 * @param options Options for this specific state
 */
export function createState<StateType extends object>(namespace: string, initialState: StateType, options: CreateStateOptions = {}): StateType {
	if (rootState[namespace]) {
		if (!internalState.instanceOptions?.devtools) {
			throw new Error(duplicateNamespace(namespace))
		}
		console.warn(replacingStateForNamespace(namespace));
		const currentState = getStateSnapshot();
		currentState[namespace] = initialState;

		replaceState(currentState);
		createHistoryEntry(`@replace ${namespace}`, true);
		return rootState[namespace];
	}

	internalState.isCreatingState = true;
	const [resolvedInitialState, isPersistent, persistenceLocation] = getInitialState(namespace, initialState, options);
	rootState[namespace] = resolvedInitialState;
	internalState.isCreatingState = false;
	createHistoryEntry(`@init ${namespace}`, true);

	if (isPersistent && persistenceLocation) {
		// setup watcher to keep state up to date
		const unwatchFunc = watchState(() => rootState[namespace], {
			emitInitialValue: false,
			onSetStateDone: value => persistenceLocation.setItem('__diffx__' + namespace, JSON.stringify(value))
		});
		internalState.watchers.push({ namespace, unwatchFunc });
	}

	return rootState[namespace];
}

/**
 * Set state in diffx asynchronously
 * @param reason The reason why the state changed
 * @param asyncMutatorFunc A function (that can change the state and) returns a `Promise`
 * @param onDone A mutatorFunc for when the asyncMutatorFunc has finished successfully.
 * @param onError A mutatorFunc for when the asyncMutatorFunc has encountered an error.
 */
export function setState<ResolvedType, ErrorType = unknown>(
	reason: string,
	asyncMutatorFunc: () => Promise<ResolvedType>,
	onDone: (result: ResolvedType) => void,
	onError?: (error: ErrorType) => void
): void;
/**
 * Set state in diffx synchronously
 * @param reason The reason why the state changed
 * @param mutatorFunc A function that changes the state
 */
export function setState(reason: string, mutatorFunc: () => void): void;
export function setState(reason: string, mutatorFunc, onDone = undefined, onError = undefined) {
	if (onDone) {
		_setStateAsync(reason, mutatorFunc, onDone, onError);
	} else {
		_setState({ reason, mutatorFunc });
	}
}

/**
 * Watch state for changes
 * @param stateGetter A callback which should return the state to watch or an array of states to watch.
 * @param options Options for how to watch the state
 * @return Function for stopping the watcher
 */
export function watchState<T>(stateGetter: () => T, options: WatchOptions<T>): () => void {
	if (!options.onSetStateDone && !options.onEachValueUpdate && !options.onEachSetState) {
		throw new Error(missingWatchCallbacks)
	}
	const setStateDoneWatcherId = ++internalState.setStateDoneEmittersId;
	const eachSetStateWatcherId = ++internalState.eachSetStateEmittersId;
	let oldValue;
	const getter = stateGetter;
	stateGetter = () => initializeValue(getter());
	oldValue = clone(getter());

	let stateBeforeSetState;
	let initialValue;
	if (options.onSetStateDone) {
		initialValue = clone(oldValue);
	}

	// If the watcher is not lazy, call the callbacks immediately with the current value
	if (options.emitInitialValue) {
		if (options.onEachValueUpdate) {
			options.onEachValueUpdate(oldValue);
		}
		if (options.onEachSetState) {
			options.onEachSetState(oldValue);
		}
		if (options.onSetStateDone) {
			options.onSetStateDone(oldValue);
		}
	}

	return effect<T>(stateGetter, {
		lazy: false,
		onTrigger: () => {
			const newValue = getter();
			const newValueString = JSON.stringify(newValue);
			const newValueClone = newValueString === undefined ? undefined : JSON.parse(newValueString);

			// Default change comparison
			if (!options?.hasChangedComparer && newValueString === JSON.stringify(oldValue)) {
				// Don't update oldValue to be newValue since they're identical
				return;
			}

			// User specified change comparison
			if (options?.hasChangedComparer && !options.hasChangedComparer(clone(newValueClone), clone(oldValue))) {
				// We don't know how the user decides if anything has changed or not,
				// so we update the oldValue with whatever the newValue is.
				oldValue = newValueClone === undefined ? undefined : clone(newValue);
				return;
			}

			// notify watchers
			if (options?.onEachValueUpdate) {
				options.onEachValueUpdate(clone(newValue), clone(oldValue));
			}
			if (options?.onEachSetState) {
				const oldValueToEmit = clone(oldValue);
				internalState.eachSetStateEmitters[eachSetStateWatcherId] = () => {
					options.onEachSetState(clone(newValue), oldValueToEmit);
				}
			}
			if (options?.onSetStateDone) {
				internalState.setStateDoneEmitters[setStateDoneWatcherId] = () => {
					options.onSetStateDone(clone(newValue), clone(initialValue));
					initialValue = clone(newValue);
				}
			}

			// update oldValue to be the newValue
			oldValue = clone(newValue);
		}
	});
}

/**
 * Removes state from diffx.
 *
 * Watchers for the state that is removed will _not_ automatically be stopped.
 * @param namespace
 */
export function destroyState(namespace: string) {
	delete rootState[namespace];
}
