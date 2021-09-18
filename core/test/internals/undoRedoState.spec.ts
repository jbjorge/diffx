import { setState, watchState } from '../../src';
import { redoState, undoState } from '../../src/internals/undoRedoState';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

describe('.undoState()', () => {
	test('it should do nothing if there are no diffs', () => {
		return new Promise(resolve => {
			ctx.watchers.push(watchState(() => ctx.state.a, newValue => {
				throw new Error('Undo misbehaved');
			}))
			undoState();
			undoState();
			undoState();
			setTimeout(resolve, 200);
		})
	})

	test('it should undo the state', () => {
		return new Promise<number>(resolve => {
			const values: number[] = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 5) {
					unwatch();
					resolve(values[4]);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState();
		})
			.then(value => {
				expect(value).toEqual(3);
			});
	});

	test('it should undo further back when it is called again', () => {
		return new Promise<number>(resolve => {
			let values = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 6) {
					unwatch();
					resolve(values[5]);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState();
			undoState();
		})
			.then(val => {
				expect(val).toEqual(2);
			})
	})

	test('it should reset its undo point after state is changed', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 10) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState(); // 3
			setState('5', () => ctx.state.a = 5);
			setState('6', () => ctx.state.a = 6);
			undoState(); // 5
			undoState(); // 3
			undoState(); // 2
		})
			.then(val => {
				expect(val).toStrictEqual([1, 2, 3, 4, 3, 5, 6, 5, 3, 2]);
			})
	})

	test('it should allow number of steps back as argument', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 8) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState(); // 3
			setState('5', () => ctx.state.a = 5);
			setState('6', () => ctx.state.a = 6);
			undoState({ steps: 3 });
		})
			.then(val => {
				expect(val).toStrictEqual([1, 2, 3, 4, 3, 5, 6, 2]);
			})
	})
})

describe('.redoState()', () => {
	test('it should do nothing if no undo\'s have been done', () => {
		return new Promise(resolve => {
			ctx.watchers.push(watchState(() => ctx.state.a, newValue => {
				throw new Error('Redo misbehaved');
			}));
			redoState();
			redoState();
			redoState();
			setTimeout(resolve, 200);
		});
	})

	test('it should redo the state', () => {
		return new Promise<number[]>(resolve => {
			const values: number[] = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 6) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState();
			redoState();
		})
			.then(value => {
				expect(value).toStrictEqual([1,2,3,4,3,4]);
			});
	});

	test('it should redo further when it is called again', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 9) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState();
			undoState();
			redoState();
			undoState();
			redoState();
		})
			.then(val => {
				expect(val).toStrictEqual([1,2,3,4,3,2,3,2,3]);
			})
	})


	test('.redoState() should allow number of steps back as argument', () => {
		return new Promise<number[]>(resolve => {
			let values = [];
			const unwatch = watchState(() => ctx.state.a, newValue => {
				values.push(newValue);
				if (values.length === 9) {
					unwatch();
					resolve(values);
				}
			})
			setState('1', () => ctx.state.a = 1);
			setState('2', () => ctx.state.a = 2);
			setState('3', () => ctx.state.a = 3);
			setState('4', () => ctx.state.a = 4);
			undoState();
			undoState();
			redoState({steps: 10});
			undoState({steps: 10});
			redoState({steps: 2});
		})
			.then(val => {
				expect(val).toStrictEqual([1,2,3,4,3,2,4,0,2]);
			})
	})
})