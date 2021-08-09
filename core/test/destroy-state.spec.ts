import { createState, destroyState, diffxInternals, setDiffxOptions } from '../src';
import rootState from '../src/root-state';
import { firstArrayItem, lastArrayItem } from './array-utils';

describe('createDiffs == false', () => {
	beforeAll(() => {
		setDiffxOptions({ createDiffs: false });
	})

	beforeEach(() => diffxInternals._deleteAllDiffs());

	test('it should remove the state from the state tree', () => {
		const state = createState('state1', { a: 0 });
		expect(rootState['state1']).toStrictEqual(state);

		destroyState('state1');

		const diffs = diffxInternals.getDiffs();
		expect(diffs.length).toEqual(0);
		expect(rootState['state1']).toBeUndefined();
	})
})

describe('createDiffs == true', () => {
	beforeAll(() => {
		setDiffxOptions({ createDiffs: true });
	})

	beforeEach(() => diffxInternals._deleteAllDiffs());

	test('it should remove the state from the state tree and create a reversible history entry', () => {
		const state = createState('state1', { a: 0 });
		expect(rootState['state1']).toStrictEqual(state);
		expect(diffxInternals.getDiffs().length).toEqual(1);

		destroyState('state1');

		const diffs = diffxInternals.getDiffs();
		expect(diffs.length).toEqual(2);
		expect(rootState['state1']).toBeUndefined();

		const destructionDiff = lastArrayItem(diffs);
		expect(destructionDiff.isGeneratedByDiffx).toBeTruthy();
		expect(destructionDiff.diff).toStrictEqual({
			state1: [{
				a: 0
			}, 0, 0]
		});
		expect(destructionDiff.reason).toEqual('@destroy state1');
	})
})
