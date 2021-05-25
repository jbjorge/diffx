import { createReactiveObject } from './createReactiveObject';
import { DiffEntry } from './internals';

export type DiffListenerCallback = (diff: DiffEntry, commit?: boolean) => void;
export type DiffListeners = { [listenerId: string]: DiffListenerCallback }
/**
 * Used for emitting the final state instead
 * of emitting intermittent state changes during
 * `.setState()`.
 */
type DelayedEmitterMap = { [id: string]: () => void };

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

export interface VueReactive {
	track: any;
	TrackOpTypes: any;
	trigger: any;
	TriggerOpTypes: any;
	isRef: any;
	effect: any;
}

export default {
	isReplacingState: false,
	stateModificationsPaused: false,
	stateModificationsLocked: false,
	isUsingSetFunction: false,
	isCreatingState: false,
	stateReplacementKey: 0,
	stateAccessBuffer: [] as (() => void)[],
	instanceOptions: {} as DiffxOptions,
	diffs: [] as DiffEntry[],
	diffListeners: {} as DiffListeners,
	delayedEmitters: {} as DelayedEmitterMap,
	vueReactive: {} as VueReactive
};