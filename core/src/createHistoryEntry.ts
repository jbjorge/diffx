import { diff } from "jsondiffpatch";
import clone from "./clone";
import internalState from "./internal-state";
import { DiffEntry, getStateSnapshot } from "./internals";
import rootState from "./root-state";

let previousState = clone(rootState);

/**
 * Creates a diff of the previous and current state and stores it in the
 * diff entries.
 * @param reason The reason for the change
 * @param isInitialState Should be true when the entry is the first one for the state
 * @param subHistoryEntries Entries to record as sub-history of
 */
export function createHistoryEntry(reason = '', isInitialState = false, subHistoryEntries: DiffEntry[] = []) {
	const currentState = getStateSnapshot();
	const historyEntry = getHistoryEntry(currentState, reason);
	if (!historyEntry) {
		return;
	}
	if (isInitialState) {
		historyEntry.isInitialState = true;
	}
	if (subHistoryEntries?.length) {
		historyEntry.subDiffEntries = subHistoryEntries;
	}
	saveHistoryEntry(historyEntry, currentState);
}

export function saveHistoryEntry(historyEntry: DiffEntry, currentState?: object) {
	internalState.diffs.push(historyEntry);
	for (let cbId in internalState.diffListeners) {
		internalState.diffListeners[cbId](historyEntry);
	}
	previousState = currentState ?? getStateSnapshot();
}

export function getHistoryEntry(currentState: object, reason = '') {
	if (!internalState.instanceOptions.createDiffs && !internalState.instanceOptions.devtools) {
		return;
	}
	const historyEntry: DiffEntry = {
		timestamp: Date.now(),
		reason,
		diff: diff(previousState, currentState)
	};
	if (internalState.instanceOptions?.includeStackTrace) {
		historyEntry.stackTrace = new Error().stack.split('\n').slice(3).join('\n');
	}
	return historyEntry;
}