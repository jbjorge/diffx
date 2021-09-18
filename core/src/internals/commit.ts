import { getStateAtIndex } from '../get-state-at-index';
import { createId } from '../createId';
import { diff } from 'jsondiffpatch';
import { Delta, DiffEntry, internalState } from '../internal-state';

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