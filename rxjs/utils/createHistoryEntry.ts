import { diff } from "jsondiffpatch";
import clone from "./clone";
import internalState from "./internal-state";
import { diffxInternals } from "./internals";
import rootState from "./root-state";

let previousState = clone(rootState);

/**
 * Creates a diff of the previous and current state and stores it in the
 * diff entries.
 * @param reason The reason for the change
 */
export function createHistoryEntry(reason = '') {
	if (!internalState.instanceOptions.debug) {
		return;
	}
	const currentState = clone(rootState);
	const historyEntry: diffxInternals.DiffEntry = {
		timestamp: Date.now(),
		reason,
		diff: diff(previousState, currentState)
	};
	if (internalState.instanceOptions?.debug?.includeStackTrace) {
		historyEntry.stackTrace = new Error().stack.split('\n').slice(3).join('\n');
	}
	internalState.diffs.push(historyEntry);
	for (let cbId in internalState.diffListeners) {
		internalState.diffListeners[cbId](historyEntry);
	}
	previousState = currentState;
}