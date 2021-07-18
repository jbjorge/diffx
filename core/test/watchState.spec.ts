import { createState, destroyState, diffxInternals, setDiffxOptions, setState, watchState } from '../src';

const _namespace = 'watchState-test-namespace';
let _state: { a: number, b: string };
let _watchers: any[] = [];

beforeEach(() => {
	setDiffxOptions({
		createDiffs: false,
		maxNestingDepth: 100,
		persistenceLocation: null,
		devtools: false,
		persistent: false,
		includeStackTrace: false
	});
	_watchers.forEach(unwatch => unwatch());
	_watchers = [];
	destroyState(_namespace);
	diffxInternals._deleteAllDiffs();
	delete global['__DIFFX__'];
	_state = createState(_namespace, { a: 0, b: 'hi' });
})

describe('onEachSetState', () => {
	test('it should be able to receive the initial state', () => {
		return new Promise(resolve => {
			_watchers.push(
				watchState(() => _state.a, {
					emitInitialValue: true,
					onEachSetState: resolve,
					once: true
				})
			);
		})
			.then(val => expect(val).toStrictEqual(0))
	})

	test('it should automatically unwatch when { once: true }', () => {
		const expectedResolveValue = 'expectedResolveValue';
		return new Promise(resolve => {
			watchState(() => _state.a, {
				onEachSetState: newValue => {
					if (newValue == 2) {
						throw new Error('{ once: true } did not automatically unwatch after the first value emitted');
					}
				},
				once: true
			});
			setState('increment', () => _state.a++);
			setState('increment', () => _state.a++);

			// don't know how to properly write a test for this,
			// so we instead wait a reasonable amount of time before continuing
			setTimeout(() => {
				resolve(expectedResolveValue)
			}, 50);
		})
			.then(val => expect(val).toStrictEqual(expectedResolveValue));
	})

	test('it should not automatically unwatch when { once: false }', () => {
		const expectedResolveValue = 'expectedResolveValue';
		return new Promise(resolve => {
			_watchers.push(
				watchState(() => _state.a, {
					onEachSetState: newValue => {
						if (newValue == 2) {
							resolve(expectedResolveValue);
						}
					}
				})
			);
			setState('increment', () => _state.a++);
			setState('increment', () => _state.a++);
		})
			.then(val => expect(val).toStrictEqual(expectedResolveValue));
	})

	test('it should be able to watch state and be notified when it changes due to a setState', () => {
		return new Promise(resolve => {
			watchState(() => _state.a, { onEachSetState: resolve, once: true })
			setState('increment', () => _state.a++);
		})
			.then(val => {
				expect(val).toStrictEqual(1);
			})
	})

	test('it should not be notified when setState changes state that is not watched', () => {
		const expectedResolveValue = 'expectedResolveValue';
		let unwatch;
		return new Promise(resolve => {
			_watchers.push(
				watchState(() => _state.a, {
					onEachSetState: () => {
						throw new Error('The watcher was called when an non-watched value changed.');
					}
				})
			);
			setState('increment', () => _state.b = 'hi there');

			// don't know how to properly write a test for this,
			// so we instead wait a reasonable amount of time before continuing
			setTimeout(() => resolve(expectedResolveValue), 50);
		})
			.then(val => {
				expect(val).toStrictEqual(expectedResolveValue);
			});
	})
})

describe('onSetStateDone', () => {

})

describe('onEachValueUpdate', () => {

})
