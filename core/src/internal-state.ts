import { DiffEntry } from './internals';

export type DiffListenerCallback = (diff: DiffEntry, commit?: boolean) => void;
export type DiffListeners = { [listenerId: string]: DiffListenerCallback }
/**
 * Used for emitting the final state instead
 * of emitting intermittent state changes during
 * `.setState()`.
 */
type DelayedEmitterMap = { [id: string]: () => void };

export type PersistenceLocation = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface CreateStateOptions {
	/**
	 * Persist the latest snapshot of this state and automatically use that as the initial state
	 *
	 * Default: false
	 */
	persistent?: boolean;
	/**
	 * Location for storing persistent state.
	 * E.g. localStorage or sessionStorage
	 *
	 * Default: persistenceLocation defined in setDiffxOptions
	 */
	persistenceLocation?: PersistenceLocation
}

/**
 * Set options for the diffx runtime
 */
export interface DiffxOptions {
	/**
	 * Whether to record all diffs of the state in-memory.
	 *
	 * Default: false
	 **/
	createDiffs?: boolean;
	/**
	 * Enable viewing the state history in devtools.
	 * If set to true, `createDiffs` will also be implicitly true.
	 * Not recommended for use in a production environment.
	 *
	 * Default: false
	 */
	devtools?: boolean;
	/**
	 * Store a stack-trace with every diff if `createDiffs` is enabled.
	 * Will be displayed in devtools to help with tracking down
	 * which code is making state changes.
	 *
	 * NOT recommended in production environment since creating stack traces is a slow operation!
	 *
	 * Default: false
	 */
	includeStackTrace?: boolean;
	/**
	 * Persist the latest snapshot of all states and automatically use that as the initial state
	 *
	 * Default: false
	 */
	persistent?: boolean;
	/**
	 * Location for storing persistent state.
	 * E.g. localStorage or sessionStorage
	 *
	 * Default: null
	 */
	persistenceLocation?: PersistenceLocation
}

interface InternalWatcher {
	namespace: string;
	unwatchFunc: () => void;
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
	delayedEmittersId: 1,
	watchers: [] as InternalWatcher[]
};