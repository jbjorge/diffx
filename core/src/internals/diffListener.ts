import { DiffListenerCallback, internalState } from '../internal-state';

let diffListenerId = 0;

/**
 * Adds a callback that will get called with the diff of the state on each state change
 * @param cb		Callback
 * @param lazy	If true, will only call the callback from this point on. Setting it to false/omitted it will call the
 * 							callback with all previous diffs as well.
 * @returns listener id that can be passed to `removeDiffListener` to unsubscribe
 */
export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean) {
	const listenerId = diffListenerId++;
	internalState.diffListeners[listenerId] = cb;
	if (!lazy) {
		internalState.diffs.forEach(diff => cb(diff));
	}
	return listenerId;
}

/**
 * Removes diff listener
 * @param listenerId
 */
export function removeDiffListener(listenerId: number) {
	delete internalState.diffListeners[listenerId];
}