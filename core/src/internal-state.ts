export type DiffListenerCallback = (diff: DiffEntry, commit?: boolean) => void;
export type DiffListeners = { [listenerId: string]: DiffListenerCallback }
/**
 * Used for emitting the final state instead
 * of emitting intermittent state changes during
 * `.setState()`.
 */
export type DelayedEmitter = () => void;
export type DelayedEmitterMap = { [id: string]: DelayedEmitter };

export interface Delta {
	[key: string]: any;
	[key: number]: any;
}

export interface DiffEntry {
	id: string;
	timestamp: number;
	reason: string;
	diff: Delta;
	stackTrace?: string;
	isGeneratedByDiffx?: boolean;
	async?: boolean;
	asyncOrigin?: string;
	asyncRejected?: boolean;
	subDiffEntries?: DiffEntry[];
	triggeredByDiffId?: string;
}

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
	/**
	 * Max nesting depth.
	 *
	 * If a loop of setState <--> watchState is accidentally created, it will run off and crash
	 * (and potentially crash the main thread). To avoid this, a max nesting depth can be set.
	 *
	 * Default: 100
	 */
	maxNestingDepth?: number
}

interface InternalWatcher {
	namespace: string;
	unwatchFunc: () => void;
}
export const internalState = {
	isDestroyingState: false,
	isReplacingState: false,
	stateModificationsPaused: false,
	stateModificationsLocked: false,
	isUsingSetFunction: false,
	isCreatingState: false,
	stateReplacementKey: 0,
	stateAccessBuffer: [] as (() => void)[],
	instanceOptions: { maxNestingDepth: 100 } as DiffxOptions,
	diffs: [] as DiffEntry[],
	diffListeners: {} as DiffListeners,
	setStateDoneEmitters: {} as DelayedEmitterMap,
	setStateDoneEmittersId: 1,
	eachSetStateEmitters: {} as DelayedEmitterMap,
	eachSetStateEmittersId: 1,
	isTriggeringValueWatchers: false,
	watchers: [] as InternalWatcher[],
	undoList: [] as string[],
	isUndoingRedoing: false,
	redoEnabled: false
};

/**
 * Reset for internal state (used for testing)
 *
 * @access private
 */
export function _resetForDiffxTests() {
	internalState.diffs = [];
	internalState.undoList = [];
}