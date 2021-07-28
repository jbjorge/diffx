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

/*******************************************/
/************ ON EACH SET STATE ************/
/*******************************************/
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

	describe('tag diffs that were created due to a watcher being triggered', () => {
		test('simple case', () => {
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

		test('advanced case', () => {
			return new Promise<void>(resolve => {
				watchState(() => _state.a, {
					once: true,
					onEachSetState: val => {
						setState('watcher 1', () => _state.b = 'y');
					}
				});

				const unwatch1 = watchState(() => _state.b, {
					onEachSetState: newValue => {
						if (newValue === 'y') {
							setState('watcher 2', () => _state.b += 'es');
							unwatch1();
						}
					}
				});

				const unwatch2 = watchState(() => _state.b === 'yes', {
					onEachSetState: isYes => {
						if (!isYes) {
							return;
						}
						setState(
							'watcher 3',
							() => Promise.resolve('done'),
							resolvedValue => {
								_state.b = resolvedValue;
								resolve();
							}
						)
						unwatch2();
					}
				})

				setState('trigger time', () => _state.a++);
			})
				.then(() => {
					const diffs = diffxInternals.getDiffs();
					expect(diffs.length).toEqual(3);

					const diffTree = diffs[1];
					expect(diffTree.reason).toEqual('trigger time');

					const sub1 = singleArrayItem(diffTree.subDiffEntries);
					expect(sub1.triggeredByDiffId).toEqual(diffTree.id);

					const sub2 = singleArrayItem(sub1.subDiffEntries);
					expect(sub2.triggeredByDiffId).toEqual(sub1.id);

					const sub3 = singleArrayItem(sub2.subDiffEntries);
					expect(sub3.triggeredByDiffId).toEqual(sub2.id);
					expect(sub3.async).toBeTruthy();

					const sub4 = sub3.subDiffEntries;
					expect(sub4.length).toStrictEqual(0);

					// async resolution
					const asyncResolved = lastArrayItem(diffs);
					expect(asyncResolved.reason).toEqual('watcher 3');
					expect(asyncResolved.asyncOrigin).toEqual(sub3.id);
					expect(asyncResolved.subDiffEntries.length).toStrictEqual(0);

					expect(_state.b).toEqual('done');
				})
		})
	})
})

/*******************************************/
/************ ON SET STATE DONE ************/
/*******************************************/
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

	describe('tag diffs that were created due to a watcher being triggered', () => {
		test('simple case', () => {
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

		test('advanced case', () => {
			return new Promise<void>(resolve => {
				watchState(() => _state.a, {
					once: true,
					onSetStateDone: val => {
						setState('watcher 1', () => _state.b = 'y');
					}
				});

				const unwatch1 = watchState(() => _state.b, {
					onSetStateDone: newValue => {
						if (newValue === 'y') {
							setState('watcher 2', () => _state.b += 'es');
							setState('watcher 2 increment', () => _state.a++);
							unwatch1();
						}
					}
				});

				const unwatch2 = watchState(() => _state.b === 'yes', {
					onSetStateDone: isYes => {
						if (!isYes) {
							return;
						}
						setState(
							'watcher 3',
							() => Promise.resolve('done'),
							resolvedValue => {
								_state.b = resolvedValue;
								resolve();
							}
						)
						unwatch2();
					}
				})

				setState('trigger time', () => _state.a++);
			})
				.then(() => {
					const diffs = diffxInternals.getDiffs();
					expect(diffs.length).toEqual(7);

					expect(diffs[0].isGeneratedByDiffx).toBeTruthy();

					expect(diffs[1].reason).toEqual('trigger time');
					expect(diffs[1].triggeredByDiffId).toBeUndefined();

					expect(diffs[2].reason).toEqual('watcher 1');
					expect(diffs[2].triggeredByDiffId).toEqual(diffs[1].id);

					expect(diffs[3].reason).toEqual('watcher 2');
					expect(diffs[3].triggeredByDiffId).toEqual(diffs[2].id);

					expect(diffs[4].reason).toEqual('watcher 3');
					expect(diffs[4].triggeredByDiffId).toEqual(diffs[3].id);
					expect(diffs[4].async).toBeTruthy();

					expect(diffs[5].reason).toEqual('watcher 2 increment');
					expect(diffs[5].triggeredByDiffId).toEqual(diffs[2].id);

					expect(diffs[6].reason).toEqual('watcher 3');
					expect(diffs[6].triggeredByDiffId).toBeUndefined();
					expect(diffs[6].asyncOrigin).toEqual(diffs[4].id);

					diffs.forEach(diff => expect((diff?.subDiffEntries || []).length).toStrictEqual(0));

					expect(_state.b).toEqual('done');
				})
		})
	})
})

/*******************************************/
/********** ON EACH VALUE UPDATE ***********/
/*******************************************/
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

	describe('tag diffs that were created due to a watcher being triggered', () => {
		test('simple case', () => {
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

		test('advanced case', () => {
			return new Promise<void>(resolve => {
				watchState(() => _state.a, {
					once: true,
					onEachValueUpdate: val => {
						setState('watcher 1', () => _state.b = 'y');
					}
				});

				const unwatch1 = watchState(() => _state.b, {
					onEachValueUpdate: newValue => {
						if (newValue === 'y') {
							setState('watcher 2 incrementing', () => _state.a++)
							setState('watcher 2 making a yes', () => {
								_state.b += 'es';
							});
							unwatch1();
						}
					}
				});

				const unwatch2 = watchState(() => _state.b === 'yes', {
					onEachValueUpdate: isYes => {
						if (!isYes) {
							return;
						}
						setState(
							'watcher 3',
							() => Promise.resolve('done'),
							resolvedValue => {
								_state.b = resolvedValue;
								resolve();
							}
						)
						unwatch2();
					}
				})

				setState('trigger time', () => _state.a++);
			})
				.then(() => {
					const diffs = diffxInternals.getDiffs();
					expect(diffs.length).toEqual(3);
					// console.log(JSON.stringify(diffs, null, 2));

					const diffTree = diffs[1];
					expect(diffTree.reason).toEqual('trigger time');

					const sub1 = singleArrayItem(diffTree.subDiffEntries);
					expect(sub1.triggeredByDiffId).toEqual(diffTree.id);

					expect(sub1.subDiffEntries.length).toEqual(2);
					const sub2_1 = sub1.subDiffEntries[0];
					expect(sub2_1.triggeredByDiffId).toEqual(sub1.id);
					expect(sub2_1.reason).toEqual('watcher 2 incrementing');
					expect(sub2_1.subDiffEntries.length).toStrictEqual(0);

					const sub2_2 = sub1.subDiffEntries[1];
					expect(sub2_2.triggeredByDiffId).toEqual(sub1.id);
					expect(sub2_2.reason).toEqual('watcher 2 making a yes');

					const sub2_2_1 = singleArrayItem(sub2_2.subDiffEntries);
					expect(sub2_2_1.triggeredByDiffId).toEqual(sub2_2.id);

					expect(sub2_2_1.subDiffEntries.length).toStrictEqual(0);

					expect(_state.b).toEqual('done');
				})
		})
	})
})
