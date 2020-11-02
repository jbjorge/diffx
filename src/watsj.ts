import { ComputedRef, effect, isReactive, isRef, ReactiveEffectOptions, Ref, stop } from '@vue/reactivity'
import { callWithAsyncErrorHandling, callWithErrorHandling, queuePreFlushCb, SchedulerJob } from './scheduler'
import { EMPTY_OBJ, hasChanged, isArray, isFunction, isMap, isObject, isSet, NOOP } from '@vue/shared'
import { stateOptions } from "./state-options";

export type WatchEffect = (onInvalidate: InvalidateCbRegistrator) => void

export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T)

export type WatchCallback<V = any, OV = any> = (
	value: V,
	oldValue: OV,
	onInvalidate: InvalidateCbRegistrator
) => any

type MapSources<T, Immediate> = {
	[K in keyof T]: T[K] extends WatchSource<infer V>
		? Immediate extends true ? (V | undefined) : V
		: T[K] extends object
			? Immediate extends true ? (T[K] | undefined) : T[K]
			: never
}

type InvalidateCbRegistrator = (cb: () => void) => void

export interface WatchOptionsBase {
	flush?: 'pre' | 'sync'
	onTrack?: ReactiveEffectOptions['onTrack']
	onTrigger?: ReactiveEffectOptions['onTrigger']
}

export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
	immediate?: Immediate
	deep?: boolean
}

export type WatchStopHandle = () => void

// Simple effect.
export function watchEffect(
	effect: WatchEffect,
	options?: WatchOptionsBase
): WatchStopHandle {
	return doWatch(effect, null, options)
}

// initial value for watchers to trigger on undefined initial values
const INITIAL_WATCHER_VALUE = {}

// overload #1: array of multiple sources + cb
// Readonly constraint helps the callback to correctly infer value types based
// on position in the source array. Otherwise the values will get a union type
// of all possible value types.
export function watch<T extends Readonly<Array<WatchSource<unknown> | object>>,
	Immediate extends Readonly<boolean> = false>(
	sources: T,
	cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>,
	options?: WatchOptions<Immediate>
): WatchStopHandle

// overload #2: single source + cb
export function watch<T, Immediate extends Readonly<boolean> = false>(
	source: WatchSource<T>,
	cb: WatchCallback<T, Immediate extends true ? (T | undefined) : T>,
	options?: WatchOptions<Immediate>
): WatchStopHandle

// overload #3: watching reactive object w/ cb
export function watch<T extends object,
	Immediate extends Readonly<boolean> = false>(
	source: T,
	cb: WatchCallback<T, Immediate extends true ? (T | undefined) : T>,
	options?: WatchOptions<Immediate>
): WatchStopHandle

// implementation
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
	source: T | WatchSource<T>,
	cb: any,
	options?: WatchOptions<Immediate>
): WatchStopHandle {
	if (stateOptions.debug && !isFunction(cb)) {
		console.warn(
			`\`watch(fn, options?)\` signature has been moved to a separate API. ` +
			`Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
			`supports \`watch(source, cb, options?) signature.`
		)
	}
	return doWatch(source as any, cb, options)
}

function doWatch(
	source: WatchSource | WatchSource[] | WatchEffect | object,
	cb: WatchCallback | null,
	{ immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {
	if (stateOptions.debug && !cb) {
		if (immediate !== undefined) {
			console.warn(
				`watch() "immediate" option is only respected when using the ` +
				`watch(source, callback, options?) signature.`
			)
		}
		if (deep !== undefined) {
			console.warn(
				`watch() "deep" option is only respected when using the ` +
				`watch(source, callback, options?) signature.`
			)
		}
	}

	const warnInvalidSource = (s: unknown) => {
		console.warn(
			`Invalid watch source: `,
			s,
			`A watch source can only be a getter/effect function, a ref, ` +
			`a reactive object, or an array of these types.`
		)
	}

	let getter: () => any
	let forceTrigger = false
	if (isRef(source)) {
		getter = () => (source as Ref).value
		forceTrigger = !!(source as any)._shallow
	} else if (isReactive(source)) {
		getter = () => source
		deep = true
	} else if (isArray(source)) {
		getter = () =>
			source.map(s => {
				if (isRef(s)) {
					return s.value
				} else if (isReactive(s)) {
					return traverse(s)
				} else if (isFunction(s)) {
					return callWithErrorHandling(s)
				} else {
					stateOptions.debug && warnInvalidSource(s)
				}
			})
	} else if (isFunction(source)) {
		if (cb) {
			// getter with cb
			getter = () =>
				callWithErrorHandling(source)
		} else {
			// no cb -> simple effect
			getter = () => {
				if (cleanup) {
					cleanup()
				}
				return callWithErrorHandling(
					source,
					[onInvalidate]
				)
			}
		}
	} else {
		getter = NOOP;
		stateOptions.debug && warnInvalidSource(source)
	}

	if (cb && deep) {
		const baseGetter = getter
		getter = () => traverse(baseGetter())
	}

	let cleanup: () => void
	const onInvalidate: InvalidateCbRegistrator = (fn: () => void) => {
		cleanup = runner.options.onStop = () => {
			callWithErrorHandling(fn)
		}
	}

	let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE
	const job: SchedulerJob = () => {
		if (!runner.active) {
			return
		}
		if (cb) {
			// watch(source, cb)
			const newValue = runner()
			if (deep || forceTrigger || hasChanged(newValue, oldValue)) {
				// cleanup before running cb again
				if (cleanup) {
					cleanup()
				}
				callWithAsyncErrorHandling(cb, [
					newValue,
					// pass undefined as the old value when it's changed for the first time
					oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
					onInvalidate
				])
				oldValue = newValue
			}
		} else {
			// watchEffect
			runner()
		}
	}

	// important: mark the job as a watcher callback so that scheduler knows
	// it is allowed to self-trigger (#1727)
	job.allowRecurse = !!cb

	let scheduler: ReactiveEffectOptions['scheduler']
	if (flush === 'sync') {
		scheduler = job
	} else {
		// default: 'pre'
		scheduler = () => {
			queuePreFlushCb(job)
		}
	}

	const runner = effect(getter, {
		lazy: true,
		onTrack,
		onTrigger,
		scheduler
	})

	// initial run
	if (cb) {
		if (immediate) {
			job()
		} else {
			oldValue = runner()
		}
	} else {
		runner()
	}

	return () => {
		stop(runner)
	}
}

function traverse(value: unknown, seen: Set<unknown> = new Set()) {
	if (!isObject(value) || seen.has(value)) {
		return value
	}
	seen.add(value)
	if (isRef(value)) {
		traverse(value.value, seen)
	} else if (isArray(value)) {
		for (let i = 0; i < value.length; i++) {
			traverse(value[i], seen)
		}
	} else if (isSet(value) || isMap(value)) {
		value.forEach((v: any) => {
			traverse(v, seen)
		})
	} else {
		for (const key in value) {
			traverse(value[key], seen)
		}
	}
	return value
}
