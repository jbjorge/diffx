import { setState } from '../../src';
import { getDiffs } from '../../src/internals/getDiffs';
import { commit } from '../../src/internals/commit';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

test('.commit() should combine all diffs', () => {
	setState('1', () => ctx.state.a++);
	setState('2', () => ctx.state.a++);
	setState('3', () => ctx.state.a++);
	const diffs = getDiffs();
	expect(diffs.length).toEqual(4);
	commit();
	const combinedDiffs = getDiffs();
	expect(combinedDiffs.length).toEqual(1);
	expect(combinedDiffs[0].reason).toEqual('@commit');
	expect(combinedDiffs[0].diff).toStrictEqual({ [ctx.namespace]: [{ a: 3, b: 'hi' }] });
	expect(combinedDiffs[0].isGeneratedByDiffx).toBeTruthy();
})

test('.commit(index) should combine all diffs up to index + 1', () => {
	{
		for (let i = 0; i < 3; i++) {
			setState(i.toString(), () => ctx.state.a++);
		}
		const diffs = getDiffs();
		expect(diffs.length).toEqual(4);
		commit(2);
		const combinedDiffs = getDiffs();
		expect(combinedDiffs.length).toEqual(3);
		expect(combinedDiffs[0].reason).toEqual('@commit');
		expect(combinedDiffs[0].diff).toStrictEqual({ [ctx.namespace]: [{ a: 1, b: 'hi' }] });
		expect(combinedDiffs[0].isGeneratedByDiffx).toBeTruthy();
	}

	for (let i = 3; i < 10; i++) {
		setState(i.toString(), () => ctx.state.a++);
	}
	const diffs = getDiffs();
	expect(diffs.length).toEqual(10);
	commit(7);
	const combinedDiffs = getDiffs();
	expect(combinedDiffs.length).toEqual(4);
})