import clone from '../clone';
import { internalState } from '../internal-state';

/**
 * Gets all diffs that have been recorded this far
 */
export function getDiffs() {
	return clone(internalState.diffs);
}