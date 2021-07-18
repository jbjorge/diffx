import { diff } from "jsondiffpatch";
import clone from "./clone";
import internalState from "./internal-state";
import { DiffEntry, getStateSnapshot } from "./internals";
import rootState from "./root-state";
import { createId } from './createId';

let previousState = clone(rootState);

/**
 * Creates a diff of the previous and current state and stores it in the
 * diff entries.
 * @param reason The reason for the change
 * @param isGeneratedByDiffx Should be true when the entry is the first one for the state
 * @param subHistoryEntries Entries to record as sub-history of
 */
export function createHistoryEntry(reason = '', isGeneratedByDiffx = false, subHistoryEntries: DiffEntry[] = []) {
	if (!shouldSaveDiff()) {
		return;
	}
	const currentState = getStateSnapshot();
	const historyEntry = getHistoryEntry(currentState, reason);
	if (!historyEntry) {
		return;
	}
	if (isGeneratedByDiffx) {
		historyEntry.isGeneratedByDiffx = true;
	}
	if (subHistoryEntries?.length) {
		historyEntry.subDiffEntries = subHistoryEntries;
	}
	saveHistoryEntry(historyEntry, currentState);
}

export function saveHistoryEntry(historyEntry: DiffEntry, currentState?: object) {
	if (!shouldSaveDiff()) {
		return;
	}
	internalState.diffs.push(historyEntry);
	for (let cbId in internalState.diffListeners) {
		internalState.diffListeners[cbId](historyEntry);
	}
	previousState = currentState ?? getStateSnapshot();
}

function getHistoryEntry(currentState: object, reason = '') {
	const historyEntry: DiffEntry = {
		id: createId(),
		timestamp: Date.now(),
		reason,
		diff: diff(previousState, currentState)
	};
	if (internalState.instanceOptions?.includeStackTrace) {
		historyEntry.stackTrace = new Error().stack.split('\n').slice(3).join('\n');
	}
	return historyEntry;
}

function shouldSaveDiff() {
	return internalState.instanceOptions.createDiffs || internalState.instanceOptions.devtools;
}