import clone from '../clone';
import rootState from '../root-state';

/**
 * Gets a snapshot of the current state
 */
export function getStateSnapshot() {
	return clone(rootState);
}