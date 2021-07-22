import { DiffEntry, getStateSnapshot } from './internals';
import internalState from './internal-state';
import { createId } from './createId';
import { diff } from 'jsondiffpatch';
import { saveHistoryEntry } from './createHistoryEntry';
import { runEachSetStateEmitters, runSetStateDoneEmitters } from './delayedEmitters';
import {
	maxDepthReached,
	missingMutatorFunc,
	missingOnDoneHandler,
	missingOnErrorHandler,
	missingReason,
	pausedStateMessage,
	stateChangedInPromise,
	stateChangedWithoutSetState
} from './console-messages';
import { trigger } from '@vue/reactivity';
import { lastArrayItem } from './array-utils';

interface InternalSetStateArgs {
	reason: string;
	mutatorFunc: () => (void | Promise<any> | Promise<() => void>);
	extraProps?: {
		asyncDiffOrigin: string;
	}
}

export function _setStateAsync<ResolvedType, ErrorType = unknown>(
	reason: string,
	asyncMutatorFunc: () => Promise<ResolvedType>,
	onDone: (result: ResolvedType) => void | Promise<any>,
	onError?: (error: ErrorType) => void | Promise<any>
): Promise<void> {
	return new Promise((resolve, reject) => {
		_setState({
			reason,
			mutatorFunc: () => {
				return asyncMutatorFunc()
					.then(
						value => () => {
							const res = onDone(value);
							if (res instanceof Promise) {
								res.then(resolve);
							} else {
								resolve();
							}
						},
						err => () => {
							const errorFunc = onError || (() => {
								console.warn(missingOnErrorHandler);
								console.error(err);
							})
							const errRes = errorFunc(err);
							if (errRes instanceof Promise) {
								errRes.then((val) => reject(val || err));
							} else {
								reject(err);
							}
						}
					)
			}
		});
	})
}

// --- recursive setState helpers
let setStateNestingLevel = -1;
let previousLevel = 0;
let hist: DiffEntry[] = [];
let paren = [hist];
let current = hist;
let children;
let isTriggeringWatchers = false;
let triggerLevel = [];
let isTriggeringLevel: { [level: number]: boolean } = {};
let runningWatchersLevel = -1;
let setStateDoneTriggerId;

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

export function _setState({ reason, mutatorFunc, extraProps }: InternalSetStateArgs) {
	runningWatchersLevel = setStateNestingLevel + 1;
	if (setStateNestingLevel > internalState.instanceOptions.maxNestingDepth) {
		throw new Error(maxDepthReached(internalState.instanceOptions.maxNestingDepth));
	}
	if (typeof reason !== 'string') {
		throw new Error(missingReason);
	}
	if (typeof mutatorFunc !== 'function') {
		throw new Error(missingMutatorFunc)
	}
	if (internalState.stateModificationsLocked) {
		console.info(pausedStateMessage(reason));
		return;
	}
	internalState.isUsingSetFunction = true;

	// ---- handle recursive setState

	let level = ++setStateNestingLevel;

	const currentState = getStateSnapshot();
	let didMoveDown = false;
	const diffEntry: DiffEntry = {
		id: createId(),
		reason,
		timestamp: Date.now(),
		diff: {},
		subDiffEntries: []
	};
	if (isTriggeringLevel[level - 1]) {
		diffEntry.triggeredByWatcher = true;
		if (lastArrayItem(current)) {
			diffEntry.triggeredByDiffId = lastArrayItem(current).id;
		}
	}
	if (setStateDoneTriggerId) {
		diffEntry.triggeredByDiffId = setStateDoneTriggerId;
	}
	if (internalState.isTriggeringValueWatchers) {
		diffEntry.triggeredByWatcher = true;
		if (lastArrayItem(lastArrayItem(paren))) {
			diffEntry.triggeredByDiffId = lastArrayItem(lastArrayItem(paren)).id;
		}
	}
	if (internalState.instanceOptions?.includeStackTrace) {
		diffEntry.stackTrace = new Error().stack;
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

	let assignmentResult = mutatorFunc();
	isTriggeringLevel[level] = true;
	runEachSetStateEmitters();
	delete isTriggeringLevel[level];
	if (assignmentResult instanceof Promise) {
		thisLevelObject.async = true;
		assignmentResult = assignmentResult.then(
			innerMutatorFunc => {
				if (typeof innerMutatorFunc !== 'function') {
					console.warn(missingOnDoneHandler);
					return;
				}
				_setState({
					reason,
					mutatorFunc: innerMutatorFunc,
					extraProps: { asyncDiffOrigin: thisLevelObject.id }
				});
			}
		)
			.catch(err => {
				if (err.message === stateChangedWithoutSetState) {
					console.error(stateChangedInPromise);
				} else {
					console.error(err);
				}
			})
	}

	const newState = getStateSnapshot();
	thisLevelObject.diff = diff(currentState, newState);
	setStateNestingLevel--;
	if (didMoveDown) {
		paren.pop();
	}

	// ------------------------------

	if (level === 0) {
		if (hist.length > internalState.instanceOptions.maxNestingDepth) {
			throw new Error(maxDepthReached(internalState.instanceOptions.maxNestingDepth));
		}
		const h1 = hist[0];
		if (h1) {
			h1.subDiffEntries = h1.subDiffEntries.concat(hist.slice(1));
			saveHistoryEntry(h1);
		}
		internalState.isUsingSetFunction = false;

		// reset recursive counters
		setStateNestingLevel = -1;
		previousLevel = 0;
		hist = [];
		paren = [hist];
		current = hist;
		children = undefined;
		runningWatchersLevel = -1;
		setStateDoneTriggerId = h1.id;
		runSetStateDoneEmitters();
		setStateDoneTriggerId = '';
		return (assignmentResult instanceof Promise) ? assignmentResult : Promise.resolve();
	}
}
