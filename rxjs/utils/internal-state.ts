import { createReactiveObject } from './createReactiveObject';
import { diffxInternals } from './internals';

export type DiffListenerCallback = (diff: diffxInternals.DiffEntry, commit?: boolean) => void;
export type DiffListeners = { [listenerId: string]: DiffListenerCallback }

/**
 * Set options for the diffx runtime
 */
export interface DiffxOptions {
	debug?: {
		/** Enable viewing the state history in devtools. Not recommended for use in a production environment. */
		devtools?: boolean;
		/** Beware, creating stack traces for each state change is a slow operation. Not recommended for use in a production environment. */
		includeStackTrace?: boolean;
	};
}

export default {
	isReplacingState: false,
	stateModificationsPaused: false,
	stateModificationsLocked: false,
	isUsingSetFunction: false,
	isCreatingState: false,
	stateReplacementKey: 0,
	stateAccessBuffer: [],
	instanceOptions: {} as DiffxOptions,
	diffs: [] as diffxInternals.DiffEntry[],
	diffListeners: {} as DiffListeners
};