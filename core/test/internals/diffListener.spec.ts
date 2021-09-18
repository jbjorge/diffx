import { setState } from '../../src';
import { DiffEntry } from '../../src/internal-state';
import { addDiffListener, removeDiffListener } from '../../src/internals/diffListener';
import { createTestContext, TestContext } from '../create-test-context';

let ctx = {} as TestContext;
beforeEach(() => {
	ctx = createTestContext()
});

describe('diffListener', () => {
	test('a lazy addDiffListener should only be notified about new diffs', () => {
		setState('diff 1', () => ctx.state.a++);
		const p = new Promise<DiffEntry>(resolve => {
			addDiffListener(diff => resolve(diff), true)
		})
			.then(diff => {
				expect(diff.reason).toEqual('diff 2');
			})
		setState('diff 2', () => ctx.state.a++);
		return p;
	});

	test('a non-lazy addDiffListener should be notified about all diffs', () => {
		setState('diff 1', () => ctx.state.a++);
		let diffs: DiffEntry[] = [];
		const p = new Promise<void>(resolve => {
			addDiffListener(diff => {
				diffs.push(diff);
				if (diffs.length === 3) {
					resolve();
				}
			})
		})
			.then(() => {
				expect(diffs[0].reason).toEqual(`@init ${ctx.namespace}`);
				expect(diffs[1].reason).toEqual('diff 1');
				expect(diffs[2].reason).toEqual('diff 2');
			})
		setState('diff 2', () => ctx.state.a++);
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