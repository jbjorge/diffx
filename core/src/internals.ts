import { diff, unpatch } from 'jsondiffpatch';
import clone from './clone';
import internalState, { DiffListenerCallback } from './internal-state';
import rootState from './root-state';
import { runEachSetStateEmitters, runSetStateDoneEmitters } from './delayedEmitters';
import { createId } from './createId';
import { getStateAtIndex } from './get-state-at-index';
import { createHistoryEntry } from './createHistoryEntry';

export interface Delta {
	[key: string]: any;
	[key: number]: any;
}

export interface DiffEntry {
	id: string;
	timestamp: number;
	reason: string;
	diff: Delta;
	stackTrace?: string;
	isGeneratedByDiffx?: boolean;
	async?: boolean;
	asyncOrigin?: string;
	asyncRejected?: boolean;
	subDiffEntries?: DiffEntry[];
	triggeredByDiffId?: string;
}

let diffListenerId = 0;

/**
 * Adds a callback that will get called with the diff of the state on each state change
 * @param cb		Callback
 * @param lazy	If true, will only call the callback from this point on. Setting it to false/omitted it will call the
 * 							callback with all previous diffs as well.
 * @returns listener id that can be passed to `removeDiffListener` to unsubscribe
 */
export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean) {
	const listenerId = diffListenerId++;
	internalState.diffListeners[listenerId] = cb;
	if (!lazy) {
		internalState.diffs.forEach(diff => cb(diff));
	}
	return listenerId;
}

/**
 * Removes diff listener
 * @param listenerId
 */
export function removeDiffListener(listenerId: number) {
	delete internalState.diffListeners[listenerId];
}

/**
 * Combines all diffs into one diff before continuing as normal
 * @param count Number of diffs to combine
 */
export function commit(count?: number) {
	count = count || internalState.diffs.length;
	if (!count) {
		// nothing to commit, no point in collapsing diff #0
		return;
	}
	const combinedState = getStateAtIndex(count - 1);
	const diffEntry: DiffEntry = {
		id: createId(),
		timestamp: Date.now(),
		reason: '@commit',
		diff: diff({}, combinedState) || {} as Delta,
		isGeneratedByDiffx: true
	};
	internalState.diffs = [diffEntry].concat(internalState.diffs.slice(count));
	internalState.diffs.forEach((diff, index) => {
		for (let cbId in internalState.diffListeners) {
			internalState.diffListeners[cbId](diff, index === 0);
		}
	})
}

/**
 * Replaces the current state.
 * Needs to be provided the `rootState`, e.g. like the one returned from `getStateSnapshot()`.
 * @param state
 */
export function replaceState(state: any): void {
	internalState.isReplacingState = true;
	internalState.stateReplacementKey = Math.random() + 1;
	for (let namespace in rootState) {
		// @ts-ignore
		for (let propName in rootState[namespace]) {
			if (state[namespace] === undefined || state[namespace][propName] === undefined) {
				// @ts-ignore
				rootState[namespace][propName] = undefined;
				// @ts-ignore
				delete rootState[namespace][propName];
			}
		}
		if (!state[namespace]) {
			// @ts-ignore
			delete rootState[namespace];
		}
	}
	for (let namespace in state) {
		if (!rootState[namespace]) {
			rootState[namespace] = {
				__diffx_stateReplacementKey: internalState.stateReplacementKey,
				__diffx_stateReplacementValue: state[namespace]
			};
		}
	}
	for (let namespace in state) {
		for (let propName in state[namespace]) {
			// @ts-ignore
			rootState[namespace][propName] = {
				__diffx_stateReplacementKey: internalState.stateReplacementKey,
				__diffx_stateReplacementValue: state[namespace][propName]
			};
		}
	}
	internalState.isReplacingState = false;
	// @ts-ignore
	internalState.stateReplacementKey = null;
	internalState.stateAccessBuffer.forEach(trackOrTrigger => trackOrTrigger());
	runEachSetStateEmitters();
	runSetStateDoneEmitters();
	internalState.stateAccessBuffer = [];
}

/**
 * Disables changes to the state
 */
export function lockState() {
	internalState.stateModificationsLocked = true;
}

/**
 * Enables changes to the state
 */
export function unlockState() {
	internalState.stateModificationsLocked = false;
}

/**
 * @deprecated
 * Deprecated and does nothing until implementation is properly tested.
 * Pauses changes to the state and buffers the changes
 */
export function pauseState() {
	console.info('diffxInternals.pauseState() not implemented');
	// internalState.stateModificationsPaused = true;
}

/**
 * @deprecated
 * Deprecated and does nothing until implementation is properly tested.
 * (Unpauses changes to the state and applies all the changes.)
 */
export function unpauseState() {
	console.info('diffxInternals.unpauseState() not implemented');
	// internalState.stateModificationsPaused = false;
	// internalState.stateAccessBuffer.forEach(trackOrTrigger => trackOrTrigger());
	// internalState.stateAccessBuffer = [];
}

interface UndoOptions {
	steps?: number;
}
export function undoState(options?: UndoOptions) {
	const diffs = internalState.diffs.filter(diff => !diff.isGeneratedByDiffx && !internalState.redoList.includes(diff.id));
	if (diffs.length === 0) {
		// no more stuff to undo
		return;
	}
	const steps = Math.min(diffs.length, options?.steps ?? 1);
	const diffsToUndo = diffs.slice(-steps);
	const newState = getStateSnapshot();
	diffsToUndo.reverse().forEach(diff => {
		unpatch(newState, diff.diff);
		internalState.redoList.push(diff.id);
	});

	internalState.isUndoing = true;
	for (let namespace in newState) {
		for (let propName in newState[namespace]) {
			rootState[namespace][propName] = newState[namespace][propName];
		}
	}
	createHistoryEntry(`@undo ${diffsToUndo.length} ${diffsToUndo.length === 1 ? 'diff' : 'diffs'}`, true);
	internalState.isUndoing = false;
	runEachSetStateEmitters();
	runSetStateDoneEmitters();
}

export function redoState() {

}

/**
 * Gets a snapshot of the current state
 */
export function getStateSnapshot() {
	return clone(rootState);
}

/**
 * Gets all diffs that have been recorded this far
 */
export function getDiffs() {
	return clone(internalState.diffs);
}

/**
 * Delete all diffs (used for testing)
 *
 * @access private
 */
export function _deleteAllDiffs() {
	internalState.diffs = [];
}
