import { createState, destroyState, diffxInternals, setDiffxOptions, setState, watchState } from '../src';
import { diff } from 'jsondiffpatch';
import { lastArrayItem, singleArrayItem } from './array-utils';

const _namespace = 'watchState-test-namespace';
let _state: { a: number, b: string };
let _watchers: any[] = [];

beforeEach(() => {
	setDiffxOptions({
		createDiffs: true,
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

	test('it should tag subDiffs that were created due to a watcher being triggered', () => {
		return new Promise<void>(resolve => {
			watchState(() => _state.a, {
				onEachSetState: val => {
					setState('triggered', () => _state.b = 'triggered change');
					resolve();
				},
				once: true
			})
			setState('trigger time', () => _state.a++);
		})
			.then(() => {
				const diffs = diffxInternals.getDiffs();
				expect(diffs.length).toEqual(2);
				const last = lastArrayItem(diffs);
				expect(last.reason).toEqual('trigger time');

				// expect root diff to contain all changes
				expect(last.diff).toStrictEqual({
					"watchState-test-namespace": {
						a: [
							0,
							1
						],
						b: [
							"hi",
							"triggered change"
						]
					}
				});
				const subDiff = singleArrayItem(last.subDiffEntries);
				expect(subDiff.reason).toEqual('triggered');
				expect(subDiff.triggeredByWatcher).toBeTruthy();
				expect(subDiff.triggeredByDiffId).toEqual(last.id);
				expect(subDiff.diff).toStrictEqual({
					"watchState-test-namespace": {
						b: [
							"hi",
							"triggered change"
						]
					}
				});
			})
	})
})

describe('onSetStateDone', () => {
	test('it should be able to receive the initial state', () => {
		return new Promise(resolve => {
			_watchers.push(
				watchState(() => _state.a, {
					emitInitialValue: true,
					onSetStateDone: resolve,
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
				onSetStateDone: newValue => {
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
					onSetStateDone: newValue => {
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
			watchState(() => _state.a, { onSetStateDone: resolve, once: true })
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
					onSetStateDone: () => {
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

	test('it should tag subsequent diffs that were created due to a watcher being triggered', () => {
		return new Promise<void>(resolve => {
			watchState(() => _state.a, {
				onSetStateDone: val => {
					setState('triggered', () => _state.b = 'triggered change');
					resolve();
				},
				once: true
			})
			setState('trigger time', () => _state.a++);
		})
			.then(() => {
				const diffs = diffxInternals.getDiffs();
				expect(diffs.length).toEqual(3);

				const triggeringChange = diffs[1];
				expect(triggeringChange.subDiffEntries?.length).toEqual(0);
				expect(triggeringChange.reason).toEqual('trigger time');

				const triggeredChange = diffs[2];
				expect(triggeredChange.triggeredByDiffId).toEqual(triggeringChange.id);
				expect(triggeredChange.reason).toEqual('triggered');
				expect(triggeredChange.subDiffEntries?.length).toEqual(0);
			})
	})
})

describe('onEachValueUpdate', () => {
	test('it should be able to receive the initial state', () => {
		return new Promise(resolve => {
			_watchers.push(
				watchState(() => _state.a, {
					emitInitialValue: true,
					onEachValueUpdate: resolve,
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
				onEachValueUpdate: newValue => {
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
					onEachValueUpdate: newValue => {
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
			watchState(() => _state.a, { onEachValueUpdate: resolve, once: true })
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
					onEachValueUpdate: () => {
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

	test('it should tag subDiffs that were created due to a watcher being triggered', () => {
		return new Promise<void>(resolve => {
			watchState(() => _state.a, {
				onEachValueUpdate: val => {
					setState('triggered', () => _state.b = 'triggered change');
					resolve();
				},
				once: true
			})
			setState('trigger time', () => _state.a++);
		})
			.then(() => {
				const diffs = diffxInternals.getDiffs();
				expect(diffs.length).toEqual(2);
				const last = lastArrayItem(diffs);
				expect(last.reason).toEqual('trigger time');

				// expect root diff to contain all changes
				expect(last.diff).toStrictEqual({
					"watchState-test-namespace": {
						a: [
							0,
							1
						],
						b: [
							"hi",
							"triggered change"
						]
					}
				});
				const subDiff = singleArrayItem(last.subDiffEntries);
				expect(subDiff.reason).toEqual('triggered');
				expect(subDiff.triggeredByWatcher).toBeTruthy();
				expect(subDiff.triggeredByDiffId).toEqual(last.id);
				expect(subDiff.diff).toStrictEqual({
					"watchState-test-namespace": {
						b: [
							"hi",
							"triggered change"
						]
					}
				});
			})
	})
})
