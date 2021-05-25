import { track, TrackOpTypes, trigger, TriggerOpTypes } from '@vue/reactivity';
import internalState from './internal-state';

/**
 * Creates a reactive object.
 * @param rootObj
 */
export function createReactiveObject<T extends object>(rootObj: T = {} as T): T {
	return new Proxy(rootObj, {
		get(target, prop, receiver) {
			// If the state is being replaced, buffer the tracking of object access
			// so it can be run after the state is done being replaced
			if (internalState.isReplacingState || internalState.stateModificationsPaused) {
				internalState.stateAccessBuffer.push(() => track(target, TrackOpTypes.GET, prop));
			} else {
				track(target, TrackOpTypes.GET, prop);
			}
			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'object') {
				return createReactiveObject(value);
			} else {
				return value;
			}
		},
		set(target, key, newValue, receiver) {
			// If the state is being replaced, drop all changes
			// to the state not done by the replacement process itself.
			// This protects from potential watchers reacting to the state change
			// as it is happening and trying to change the state further.
			if (internalState.isReplacingState) {
				if (newValue?.__diffx_stateReplacementKey !== internalState.stateReplacementKey) {
					return true;
				}
				newValue = newValue.__diffx_stateReplacementValue;
			}
			// Changes to the state can be paused.
			// This drops all attempts at changing it.
			const returnValue = Reflect.set(target, key, newValue, receiver);
			const isMutatingArray = (Array.isArray(target) && key === 'length');
			if (!internalState.isUsingSetFunction && !internalState.isCreatingState && !internalState.isReplacingState && !isMutatingArray) {
				throw new Error('[diffx] State was changed without using .setState()');
			}
			// If the state is being replaced, buffer the triggering of object setting
			// so it can be run after the state is done being replaced
			if (internalState.isReplacingState || internalState.stateModificationsPaused) {
				internalState.stateAccessBuffer.push(() => trigger(target, TriggerOpTypes.SET, key, newValue));
			} else {
				trigger(target, TriggerOpTypes.SET, key, newValue);
			}
			return returnValue;
		}
	});
}