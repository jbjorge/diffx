import rootState from '../root-state';
import { runEachSetStateEmitters, runSetStateDoneEmitters } from '../delayedEmitters';
import { internalState } from '../internal-state';

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