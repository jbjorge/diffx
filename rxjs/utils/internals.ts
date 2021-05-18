import { Delta, diff } from 'jsondiffpatch';
import clone from './clone';
import internalState, { DiffListenerCallback } from './internal-state';
import rootState from './root-state';

export module diffxInternals {
	export interface DiffEntry {
		timestamp: number;
		reason: string;
		diff: Delta;
		stackTrace?: string;
	}

	let diffListenerId = 0;

	/**
	 * Adds a callback that will get called with the diff of the state on each state change
	 * @param cb		Callback
	 * @param lazy	If true, will only call the callback from this point on. Setting it to false/omitted it will call the
	 * 							callback with all previous diffs as well.
	 * @returns Function that will unsubscribe upon being called
	 */
	export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean): () => void {
		const listenerId = diffListenerId++;
		internalState.diffListeners[listenerId] = cb;
		if (!lazy) {
			internalState.diffs.forEach(diff => cb(diff));
		}
		return () => removeDiffListener(listenerId);
	}

	/**
	 * Removes diff listener
	 * @param listenerId
	 */
	function removeDiffListener(listenerId: number) {
		delete internalState.diffListeners[listenerId];
	}

	/**
	 * Combines all diffs into one diff before continuing as normal
	 */
	export function commit() {
		const diffEntry: DiffEntry = {
			timestamp: Date.now(),
			reason: 'Commit',
			diff: diff({}, clone(rootState))
		};
		internalState.diffs = [diffEntry];
		for (let cbId in internalState.diffListeners) {
			internalState.diffListeners[cbId](diffEntry, true);
		}
	}

	/**
	 * Replaces the current state.
	 * Needs to be provided the `rootState`, e.g. like the one returned from `getStateSnapshot()`.
	 * @param state
	 */
	export function replaceState(state): void {
		internalState.isReplacingState = true;
		internalState.stateReplacementKey = Math.random() + 1;
		for (let namespace in rootState) {
			for (let propName in rootState[namespace]) {
				if (state[namespace] === undefined || state[namespace][propName] === undefined) {
					rootState[namespace][propName] = undefined;
					delete rootState[namespace][propName];
				}
			}
			if (!state[namespace]) {
				delete rootState[namespace];
			}
		}
		for (let namespace in state) {
			for (let propName in state[namespace]) {
				rootState[namespace][propName] = {
					__diffx_stateReplacementKey: internalState.stateReplacementKey,
					__diffx_stateReplacementValue: state[namespace][propName]
				};
			}
		}
		internalState.isReplacingState = false;
		internalState.stateReplacementKey = null;
		internalState.stateAccessBuffer.forEach(trackOrTrigger => trackOrTrigger());
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
	 * Pauses changes to the state and buffers the changes
	 */
	export function pauseState() {
		internalState.stateModificationsPaused = true;
	}

	/**
	 * Unpauses changes to the state and applies all the changes
	 */
	export function unpauseState() {
		internalState.stateModificationsPaused = false;
		internalState.stateAccessBuffer.forEach(trackOrTrigger => trackOrTrigger());
		internalState.stateAccessBuffer = [];
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
		return internalState.diffs;
	}
}