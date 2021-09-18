import { createState, setState } from '../../src';
import { getDiffs } from '../../src/internals/getDiffs';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

test('.getDiffs() should return all diffs', () => {
	createState('state2 for getDiffs', { c: 'hello' });
	const diffs1 = getDiffs();

	expect(diffs1.map(d => d.reason)).toStrictEqual([
		'@init diffxInternals-test-namespace',
		'@init state2 for getDiffs'
	]);

	setState('getDiffs-test', () => ctx.state.b);
	const diffs2 = getDiffs();
	expect(diffs2.map(d => d.reason)).toStrictEqual([
		'@init diffxInternals-test-namespace',
		'@init state2 for getDiffs',
		'getDiffs-test'
	])

	// check that the diffs doesn't get mutated
	expect(diffs1.map(d => d.reason)).toStrictEqual(['@init diffxInternals-test-namespace', '@init state2 for getDiffs']);
})