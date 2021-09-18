import { createState, destroyState, diffxInternals, setDiffxOptions, setState, watchState } from '../src';
import { addDiffListener, DiffEntry, getDiffs, removeDiffListener, replaceState, unlockState } from '../src/internals';
import { pausedStateMessage } from '../src/console-messages';

const _namespace = 'diffxInternals-test-namespace';
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
	diffxInternals._resetForDiffxTests();
	delete global['__DIFFX__'];
	_state = createState(_namespace, { a: 0, b: 'hi' });
})

describe('diffListener', () => {
	test('a lazy addDiffListener should only be notified about new diffs', () => {
		setState('diff 1', () => _state.a++);
		const p = new Promise<DiffEntry>(resolve => {
			diffxInternals.addDiffListener(diff => resolve(diff), true)
		})
			.then(diff => {
				expect(diff.reason).toEqual('diff 2');
			})
		setState('diff 2', () => _state.a++);
		return p;
	});

	test('a non-lazy addDiffListener should be notified about all diffs', () => {
		setState('diff 1', () => _state.a++);
		let diffs: DiffEntry[] = [];
		const p = new Promise<void>(resolve => {
			diffxInternals.addDiffListener(diff => {
				diffs.push(diff);
				if (diffs.length === 3) {
					resolve();
				}
			})
		})
			.then(() => {
				expect(diffs[0].reason).toEqual(`@init ${_namespace}`);
				expect(diffs[1].reason).toEqual('diff 1');
				expect(diffs[2].reason).toEqual('diff 2');
			})
		setState('diff 2', () => _state.a++);
		return p;
	});

	test('it should be possible to remove a diff listener', () => {
		let callCount = 0;
		let listenerId = addDiffListener(diff => callCount++, true)
		setState('1', () => {
		});
		setState('2', () => {
		});
		removeDiffListener(listenerId);
		setState('3', () => {
		});
		expect(callCount).toEqual(2);
	})
});

test('.commit() should combine all diffs', () => {
	setState('1', () => _state.a++);
	setState('2', () => _state.a++);
	setState('3', () => _state.a++);
	const diffs = diffxInternals.getDiffs();
	expect(diffs.length).toEqual(4);
	diffxInternals.commit();
	const combinedDiffs = diffxInternals.getDiffs();
	expect(combinedDiffs.length).toEqual(1);
	expect(combinedDiffs[0].reason).toEqual('@commit');
	expect(combinedDiffs[0].diff).toStrictEqual({ [_namespace]: [{ a: 3, b: 'hi' }] });
	expect(combinedDiffs[0].isGeneratedByDiffx).toBeTruthy();
})

test('.commit(index) should combine all diffs up to index + 1', () => {
	{
		for (let i = 0; i < 3; i++) {
			setState(i.toString(), () => _state.a++);
		}
		const diffs = diffxInternals.getDiffs();
		expect(diffs.length).toEqual(4);
		diffxInternals.commit(2);
		const combinedDiffs = diffxInternals.getDiffs();
		expect(combinedDiffs.length).toEqual(3);
		expect(combinedDiffs[0].reason).toEqual('@commit');
		expect(combinedDiffs[0].diff).toStrictEqual({ [_namespace]: [{ a: 1, b: 'hi' }] });
		expect(combinedDiffs[0].isGeneratedByDiffx).toBeTruthy();
	}

	for (let i = 3; i < 10; i++) {
		setState(i.toString(), () => _state.a++);
	}
	const diffs = diffxInternals.getDiffs();
	expect(diffs.length).toEqual(10);
	diffxInternals.commit(7);
	const combinedDiffs = diffxInternals.getDiffs();
	expect(combinedDiffs.length).toEqual(4);
})

describe('.replaceState()', () => {
	test('it should replace state', () => {
		const newState = { [_namespace]: { a: 1, b: 'hehe', c: 'lol' } };
		diffxInternals.replaceState(newState);
		const snapshot = diffxInternals.getStateSnapshot();
		expect(snapshot).toStrictEqual(newState);
	});

	test('it should notify watchers after state replacement', () => {
		const p = new Promise<void>(resolve => {
			watchState(() => _state.b, {
				onEachValueUpdate: newValue => {
					if (newValue === 'replaced state') {
						resolve();
					}
				}
			})
		})
		replaceState({ [_namespace]: { ..._state, b: 'replaced state' } });
		return p;
	});
})

test('.lockState() should disable changing the state with a message', () => {
	const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
	diffxInternals.lockState();
	setState('1', () => _state.a = 10);
	expect(consoleSpy.mock.calls).toEqual([[pausedStateMessage('1')]]);
	expect(_state.a).not.toEqual(10);
	consoleSpy.mockRestore();
})

test('.unlockState() should enable changes to the state after .lockState()', () => {
	expect(() => unlockState()).not.toThrow();
	// lock and set some state
	const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
	diffxInternals.lockState();
	setState('1', () => _state.a = 10);
	expect(_state.a).not.toEqual(10);

	diffxInternals.unlockState();
	setState('2', () => _state.a = 5);
	expect(_state.a).toEqual(5);
	expect(consoleSpy.mock.calls).toEqual([[pausedStateMessage('1')]]);
	consoleSpy.mockRestore();
})

describe('.undoState()', () => {
	test('it should do nothing if there are no diffs', () => {
		return new Promise(resolve => {
			_watchers.push(watchState(() => _state.a, newValue => {
				throw new Error('Undo misbehaved');
			}))
			diffxInternals.undoState();
			diffxInternals.undoState();
			diffxInternals.undoState();
			setTimeout(resolve, 200);
		})
	})

	test('it should undo the state', () => {
		return new Promise<number>(resolve => {
			const values: number[] = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 5) {
					unwatch();
					resolve(values[4]);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState();
		})
			.then(value => {
				expect(value).toEqual(3);
			});
	});

	test('it should undo further back when it is called again', () => {
		return new Promise<number>(resolve => {
			let values = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 6) {
					unwatch();
					resolve(values[5]);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState();
			diffxInternals.undoState();
		})
			.then(val => {
				expect(val).toEqual(2);
			})
	})

	test('it should reset its undo point after state is changed', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 10) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState(); // 3
			setState('5', () => _state.a = 5);
			setState('6', () => _state.a = 6);
			diffxInternals.undoState(); // 5
			diffxInternals.undoState(); // 3
			diffxInternals.undoState(); // 2
		})
			.then(val => {
				expect(val).toStrictEqual([1, 2, 3, 4, 3, 5, 6, 5, 3, 2]);
			})
	})

	test('it should allow number of steps back as argument', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 8) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState(); // 3
			setState('5', () => _state.a = 5);
			setState('6', () => _state.a = 6);
			diffxInternals.undoState({ steps: 3 });
		})
			.then(val => {
				expect(val).toStrictEqual([1, 2, 3, 4, 3, 5, 6, 2]);
			})
	})
})

describe('.redoState()', () => {
	test('it should do nothing if no undo\'s have been done', () => {
		return new Promise(resolve => {
			_watchers.push(watchState(() => _state.a, newValue => {
				throw new Error('Redo misbehaved');
			}));
			diffxInternals.redoState();
			diffxInternals.redoState();
			diffxInternals.redoState();
			setTimeout(resolve, 200);
		});
	})

	test('it should redo the state', () => {
		return new Promise<number[]>(resolve => {
			const values: number[] = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 6) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState();
			diffxInternals.redoState();
		})
			.then(value => {
				expect(value).toStrictEqual([1,2,3,4,3,4]);
			});
	});

	test('it should redo further when it is called again', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 9) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState();
			diffxInternals.undoState();
			diffxInternals.redoState();
			diffxInternals.undoState();
			diffxInternals.redoState();
		})
			.then(val => {
				expect(val).toStrictEqual([1,2,3,4,3,2,3,2,3]);
			})
	})


	test('.redoState() should allow number of steps back as argument', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => _state.a, newValue => {
				values.push(newValue);
				if (values.length === 9) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => _state.a = 1);
			setState('2', () => _state.a = 2);
			setState('3', () => _state.a = 3);
			setState('4', () => _state.a = 4);
			diffxInternals.undoState();
			diffxInternals.undoState();
			diffxInternals.redoState({steps: 10});
			diffxInternals.undoState({steps: 10});
			diffxInternals.redoState({steps: 2});
		})
			.then(val => {
				expect(val).toStrictEqual([1,2,3,4,3,2,4,0,2]);
			})
	})
})

test('.getStateSnapshot() should return the current state', () => {
	const snapshot1 = diffxInternals.getStateSnapshot();
	expect(snapshot1).toStrictEqual({ 'diffxInternals-test-namespace': { a: 0, b: 'hi' } });

	// change the state
	createState('state2 for snapshot', { c: 'hello' });
	setState('s1', () => _state.b = 'howdy');

	const snapshot2 = diffxInternals.getStateSnapshot();

	// check that the snapshot doesn't get mutated
	expect(snapshot1).toStrictEqual({ 'diffxInternals-test-namespace': { a: 0, b: 'hi' } });

	expect(snapshot2).toStrictEqual({
			'diffxInternals-test-namespace': { a: 0, b: 'howdy' },
			'state2 for snapshot': { c: 'hello' }
		}
	);
})

test('.getDiffs() should return all diffs', () => {
	createState('state2 for getDiffs', { c: 'hello' });
	const diffs1 = getDiffs();

	expect(diffs1.map(d => d.reason)).toStrictEqual([
		'@init diffxInternals-test-namespace',
		'@init state2 for getDiffs'
	]);

	setState('getDiffs-test', () => _state.b);
	const diffs2 = getDiffs();
	expect(diffs2.map(d => d.reason)).toStrictEqual([
		'@init diffxInternals-test-namespace',
		'@init state2 for getDiffs',
		'getDiffs-test'
	])

	// check that the diffs doesn't get mutated
	expect(diffs1.map(d => d.reason)).toStrictEqual(['@init diffxInternals-test-namespace', '@init state2 for getDiffs']);
})

test.todo('pauseState');
test.todo('unpauseState');