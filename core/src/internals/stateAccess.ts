/**
 * Disables changes to the state
 */
import { internalState } from '../internal-state';

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
