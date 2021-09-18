import { getStateSnapshot } from '../../src/internals/getStateSnapshot';
import { createState, setState } from '../../src';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

test('.getStateSnapshot() should return the current state', () => {
	const snapshot1 = getStateSnapshot();
	expect(snapshot1).toStrictEqual({ 'diffxInternals-test-namespace': { a: 0, b: 'hi' } });

	// change the state
	createState('state2 for snapshot', { c: 'hello' });
	setState('s1', () => ctx.state.b = 'howdy');

	const snapshot2 = getStateSnapshot();

	// check that the snapshot doesn't get mutated
	expect(snapshot1).toStrictEqual({ 'diffxInternals-test-namespace': { a: 0, b: 'hi' } });

	expect(snapshot2).toStrictEqual({
			'diffxInternals-test-namespace': { a: 0, b: 'howdy' },
			'state2 for snapshot': { c: 'hello' }
		}
	);
})