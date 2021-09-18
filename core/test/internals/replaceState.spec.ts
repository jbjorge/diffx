import { replaceState } from '../../src/internals/replaceState';
import { getStateSnapshot } from '../../src/internals/getStateSnapshot';
import { watchState } from '../../src';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

describe('.replaceState()', () => {
	test('it should replace state', () => {
		const newState = { [ctx.namespace]: { a: 1, b: 'hehe', c: 'lol' } };
		replaceState(newState);
		const snapshot = getStateSnapshot();
		expect(snapshot).toStrictEqual(newState);
	});

	test('it should notify watchers after state replacement', () => {
		const p = new Promise<void>(resolve => {
			watchState(() => ctx.state.b, {
				onEachValueUpdate: newValue => {
					if (newValue === 'replaced state') {
						resolve();
					}
				}
			})
		})
		replaceState({ [ctx.namespace]: { ...ctx.state, b: 'replaced state' } });
		return p;
	});
})