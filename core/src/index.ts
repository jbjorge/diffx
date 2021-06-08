import initializeValue from './initializeValue';
import { createHistoryEntry, saveHistoryEntry } from './createHistoryEntry';
import internalState, { DiffxOptions } from './internal-state';
import { WatchOptions } from './watch-options';
import clone from './clone';
import rootState from './root-state';
import * as internals from './internals';
import { DiffEntry, getStateSnapshot, replaceState } from './internals';
import runDelayedEmitters from './runDelayedEmitters';
import { effect } from '@vue/reactivity';
import { diff } from 'jsondiffpatch';
import { createId } from './createId';

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
 */
export function createState<StateType extends object>(namespace: string, initialState: StateType): StateType {
	if (rootState[namespace]) {
		if (!internalState.instanceOptions?.devtools) {
			throw new Error(
				`[diffx] The state "${namespace}" already exists.` +
				"\ncreateState() should only be called once per namespace." +
				"\nIf you meant to replace the state, use replaceState() instead." +
				"\nIf you are running in a development environment, use setDiffxOptions({ devtools: true })."
			)
		}
		console.warn(`[diffx] Replacing the state for "${namespace}".`);
		const currentState = getStateSnapshot();
		currentState[namespace] = initialState;

		replaceState(currentState);
		createHistoryEntry(`@replace ${namespace}`, true);
		return rootState[namespace];
	}
	internalState.isCreatingState = true;
	rootState[namespace] = initialState;
	internalState.isCreatingState = false;
	createHistoryEntry(`@init ${namespace}`, true);
	return rootState[namespace];
}

/**
 * Set state in diffx synchronously
 * @param reason The reason why the state changed
 * @param mutatorFunc A function that changes the state
 */
export function setState(reason: string, mutatorFunc: () => void) {
	_setState({ reason, mutatorFunc });
}

/**
 * Set state in diffx asynchronously
 * @param reason The reason why the state changed
 * @param asyncMutatorFunc A function (that can change the state and) returns a `Promise`
 * @param onDone A mutatorFunc for when the asyncMutatorFunc has finished successfully.
 * @param onError A mutatorFunc for when the asyncMutatorFunc has encountered an error.
 */
export function setStateAsync<ResolvedType, ErrorType = unknown>(
	reason: string,
	asyncMutatorFunc: () => Promise<ResolvedType>,
	onDone: (result: ResolvedType) => void,
	onError?: (error: ErrorType) => void
) {
	_setState({
		reason,
		mutatorFunc: () => {
			return asyncMutatorFunc()
				.then(
					value => () => onDone(value),
					err => () => {
						const errorFunc = onError || (() => {
							console.warn('[diffx] setStateAsync() threw an error, but no error handler was provided. The error was:');
							console.error(err);
						})
						return errorFunc(err);
					}
				)
		}
	})
}

interface InternalSetStateArgs {
	reason: string;
	mutatorFunc: () => (void | Promise<any> | Promise<() => void>);
	extraProps?: {
		asyncDiffOrigin: string;
	}
}

// --- recursive setState helpers
let setStateNestingLevel = -1;
let previousLevel = 0;
let hist: DiffEntry[] = [];
let paren = [hist];
let current = hist;
let children;

function addParentLevelElement(el: DiffEntry) {
	const parentEl = paren[paren.length - 1];
	const parentChildren = parentEl[parentEl.length - 1].subDiffEntries;
	parentChildren.push(el);
	current = parentChildren;
	children = current[current.length - 1].subDiffEntries;
}

function addSameLevelElement(el: DiffEntry) {
	current.push(el);
	children = current[current.length - 1].subDiffEntries;
}

function addChildElement(el: DiffEntry) {
	children.push(el);
	current = children;
	paren.push(children);
	children = current[current.length - 1].subDiffEntries;
}

// ------------------------------

function _setState({ reason, mutatorFunc, extraProps }: InternalSetStateArgs) {
	if (typeof reason !== 'string') {
		throw new Error('[diffx] setState(reason, mutatorFunc) - reason must be a string.');
	}
	if (typeof mutatorFunc !== 'function') {
		throw new Error('[diffx] setState(reason, mutatorFunc) - mutatorFunc must be a function.')
	}
	if (internalState.stateModificationsLocked) {
		console.log(`[diffx] State is paused, skipped processing of "${reason}".`);
		return;
	}
	internalState.isUsingSetFunction = true;

	// ---- handle recursive setState

	const currentState = getStateSnapshot();
	const level = ++setStateNestingLevel;
	let didMoveDown = false;
	const diffEntry: DiffEntry = {
		id: createId(),
		reason,
		timestamp: Date.now(),
		diff: {},
		subDiffEntries: []
	};
	if (internalState.instanceOptions?.includeStackTrace) {
		diffEntry.stackTrace = new Error().stack.split('\n').slice(3).join('\n');
	}
	if (extraProps?.asyncDiffOrigin) {
		diffEntry.asyncOrigin = extraProps.asyncDiffOrigin;
	}
	if (level < previousLevel) {
		// moved up a level
		addParentLevelElement(diffEntry)
	} else if (level === previousLevel) {
		// back to same level
		addSameLevelElement(diffEntry);
	} else {
		// moved down a level
		addChildElement(diffEntry);
		didMoveDown = true;
	}
	let thisLevelObject = current[current.length - 1];
	previousLevel = level;

	const assignmentResult = mutatorFunc();
	if (assignmentResult instanceof Promise) {
		thisLevelObject.async = true;
		assignmentResult.then(
			innerMutatorFunc => {
				if (typeof innerMutatorFunc !== 'function') {
					console.warn('[diffx] Asynchronous usage of setState(reason, mutatorFunc): The mutatorFunc did not return a mutatorFunc. No state was changed after the asynchronous code ran.');
					return;
				}
				_setState({
					reason,
					mutatorFunc: innerMutatorFunc,
					extraProps: { asyncDiffOrigin: thisLevelObject.id }
				});
			}
		)
			.catch(err => console.error(err))
	}

	const newState = getStateSnapshot();
	thisLevelObject.diff = diff(currentState, newState);
	setStateNestingLevel--;
	if (didMoveDown) {
		paren.pop();
	}

	// ------------------------------

	if (level === 0) {
		saveHistoryEntry(hist[0]);
		runDelayedEmitters();
		internalState.isUsingSetFunction = false;

		// reset recursive counters
		setStateNestingLevel = -1;
		previousLevel = 0;
		hist = [];
		paren = [hist];
		current = hist;
		children = undefined;
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
		throw new Error('[diffx] No callback specified for watchState(_, Options). Options.onChanged and/or Options.onEachChange needs to be assigned a callback function.')
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
