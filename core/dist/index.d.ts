import { Delta } from 'jsondiffpatch';
declare type DiffListenerCallback = (diff: diffxInternals.DiffEntry, commit?: boolean) => void;
/**
 * Set options for the diffx runtime
 */
interface DiffxOptions {
    debug?: {
        /** Enable viewing the state history in devtools. Not recommended for use in a production environment. */
        devtools?: boolean;
        /** Beware, creating stack traces for each state change is slow. Not recommended for use in a production environment. */
        includeStackTrace?: boolean;
    };
    allowAnonymousStateChange?: boolean;
}
/**
 * Set options for diffx
 * @param options
 */
export declare function setDiffxOptions(options: DiffxOptions): void;
/**
 * Declare state in diffx.
 * @param namespace A string that identifies this state. Must be unique.
 * @param initialState
 */
export declare function createState<T extends object>(namespace: string, initialState: T): T;
/**
 * Set state in diffx.
 * @param reason A text that specifies the reason for the change in state.
 * @param valueAssignment A callback in which all the changes to the state happens.
 */
export declare function setState(reason: string, valueAssignment: () => void): void;
interface WatchOptions<T> {
    /** Whether to call the onChangeCallback immediately with the current value of the watched item(s). */
    immediate?: boolean;
    /**
     * Optional function that enables a custom function to decide if the state has changed.
     * Receives newValue and oldValue as arguments and should return true for changed
     * and false for no change.
     */
    hasChangedComparer?: ((newValue: T, oldValue: T) => boolean);
}
/**
 * Watch state for changes
 * @param stateGetter A callback which should return the state to watch or an array of states to watch.
 * @param onChangeCallback Will be called on every change to what stateGetter returned.
 * @param options
 */
export declare function watchState<T>(stateGetter: () => T, onChangeCallback: (newValue: T) => void, options?: WatchOptions<T>): import("@vue/reactivity").ReactiveEffect<T>;
/**
 * Removes state from diffx.
 *
 * Watchers for the state that is removed will _not_ automatically unsubscribe.
 * @param namespace
 */
export declare function destroyState(namespace: string): void;
export declare module diffxInternals {
    interface DiffEntry {
        timestamp: number;
        reason: string;
        diff: Delta;
        stackTrace?: string;
    }
    /**
     * Adds a callback that will get called with the diff of the state on each state change
     * @param cb		Callback
     * @param lazy	If true, will only call the callback from this point on. Setting it to false/omitted it will call the
     * 							callback with all previous diffs as well.
     * @returns Function that will unsubscribe upon being called
     */
    function addDiffListener(cb: DiffListenerCallback, lazy?: boolean): () => void;
    /**
     * Combines all diffs into one diff before continuing as normal
     */
    function commit(): void;
    /**
     * Replaces the current state.
     * Needs to be provided the `rootState`, e.g. like the one returned from `getStateSnapshot()`.
     * @param state
     */
    function replaceState(state: any): void;
    /**
     * Disables changes to the state
     */
    function lockState(): void;
    /**
     * Enables changes to the state
     */
    function unlockState(): void;
    /**
     * Pauses changes to the state and buffers the changes
     */
    function pauseState(): void;
    /**
     * Unpauses changes to the state and applies all the changes
     */
    function unpauseState(): void;
    /**
     * Gets a snapshot of the current state
     */
    function getStateSnapshot(): any;
    /**
     * Gets all diffs that have been recorded this far
     */
    function getDiffs(): DiffEntry[];
}
export {};
