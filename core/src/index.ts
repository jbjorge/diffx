import initializeValue from './initializeValue';
import { createHistoryEntry, saveHistoryEntry } from './createHistoryEntry';
import internalState, { CreateStateOptions, DiffxOptions } from './internal-state';
import { WatchOptions } from './watch-options';
import clone from './clone';
import rootState from './root-state';
import * as internals from './internals';
import { DiffEntry, getStateSnapshot, replaceState } from './internals';
import runDelayedEmitters from './runDelayedEmitters';
import { effect } from '@vue/reactivity';
import { diff } from 'jsondiffpatch';
import { createId } from './createId';
import { getInitialState } from './initial-state';
import { _setState, _setStateAsync } from './setState';
import { duplicateNamespace, missingWatchCallbacks, replacingStateForNamespace } from './console-messages';

export * as diffxInternals from './internals';

/**
 * Set options for diffx
 * @param options
 */
export function setDiffxOptions(options: DiffxOptions) {
	internalState.instanceOptions = options;
	if (options?.devtools) {
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
			lazy: true,
			onChanged: value => persistenceLocation.setItem('__diffx__' + namespace, JSON.stringify(value))
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
	if (!options.onChanged && !options.onEachChange) {
		throw new Error(missingWatchCallbacks)
	}
	const watchId = ++internalState.delayedEmittersId;
	let oldValue;
	const getter = stateGetter;
	stateGetter = () => initializeValue(getter());
	oldValue = clone(getter());
	if (!options.lazy) {
		if (options.onEachChange) {
			options.onEachChange(oldValue);
		}
		if (options.onChanged) {
			options.onChanged(oldValue);
		}
	}
	return effect<T>(stateGetter, {
		lazy: false,
		onTrigger: () => {
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
			if (options?.onEachChange) {
				options.onEachChange(newValue);
			}
			if (options?.onChanged) {
				internalState.delayedEmitters[watchId] = () => options.onChanged(newValue);
			}
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
