import { createState, destroyState, diffxInternals, setDiffxOptions, setState } from '../src';
import { stateChangedWithoutSetState } from '../src/console-messages';
// @ts-ignore
import { firstArrayItem, lastArrayItem, singleArrayItem } from './array-utils';

const _namespace = 'state1';
let state: { a: number };

beforeEach(() => {
	setDiffxOptions({
		createDiffs: false,
		maxNestingDepth: 100,
		persistenceLocation: null,
		devtools: false,
		persistent: false,
		includeStackTrace: false
	});
	destroyState(_namespace);
	diffxInternals._deleteAllDiffs();
	state = createState('state1', { a: 1 });
})

describe('general', () => {
	test('it should throw when state is changed outside of setState', () => {
		expect(() => state.a++).toThrowError(stateChangedWithoutSetState);
	})
})

describe('createDiffs == false', () => {
	test('it should allow setState without any changes', () => {
		setState('test', () => {});
		expect(diffxInternals.getDiffs()).toStrictEqual([]);
	})
	test('it should change the state', () => {
		setState('test', () => state.a++);
		expect(state.a).toEqual(2);
		expect(diffxInternals.getDiffs()).toStrictEqual([]);
	})
})

describe('createDiffs == true', () => {
	beforeEach(() => {
		setDiffxOptions({ createDiffs: true });
	})

	test('it should tag the first diff of a state as initial', () => {
		const state2 = createState('state2', { b: 0 });
		setState('setting state 2', () => state2.b++);
		const diffs = diffxInternals.getDiffs();
		expect(diffs.length).toEqual(2);
		expect(diffs[0].isInitialState).toBeTruthy();
		expect(diffs[1].isInitialState).toBeUndefined();
	})

	test('it should not store a diff if there are no changes', () => {
		const reason = 'test-super-unique';
		setState(reason, () => state.a = 1);
		const diffs = diffxInternals
			.getDiffs()
			.filter(diff => diff.reason === reason);
		expect(diffs.length).toEqual(1);
		expect(diffs[0].diff).toBeUndefined();
	})

	test('it should store a diff', () => {
		const reason = 'test-super-unique';
		setState(reason, () => state.a = 2);
		const diffs = diffxInternals
			.getDiffs()
			.filter(diff => diff.reason === reason);
		expect(diffs.length).toEqual(1);
		expect(diffs[0].diff).toStrictEqual({ state1: { a: [1, 2] } });
	})

	test('it should store a subDiff if setState is called within the scope of setState', () => {
		const reason = 'test-super-unique';
		setState(reason, () => {
			state.a = 2;
			setState('inner reason', () => state.a = 3);
			state.a = 4;
		});
		const diffs = diffxInternals
			.getDiffs()
			.filter(diff => diff.reason === reason);
		expect(diffs.length).toEqual(1);
		expect(diffs[0].diff).toStrictEqual({ state1: { a: [1, 4] } });
		const subDiffs = diffs[0].subDiffEntries;
		expect(subDiffs.length).toEqual(1);
		expect(subDiffs[0].diff).toStrictEqual({ state1: { a: [2, 3] } });
	})

	test('it should tag diffs as async and link to resolution diff', () => {
		const reason = 'my-reason';
		return new Promise<void>(resolve => {
			setState(
				reason,
				() => {
					state.a++;
					return Promise.resolve(state.a + 1);
				},
				resolvedValue => {
					state.a = resolvedValue;
					resolve();
				}
			);
		})
			.then(() => {
				const diffs = diffxInternals
					.getDiffs()
					.filter(diff => diff.reason === reason);
				expect(diffs.length).toEqual(2);
				const first = diffs[0];
				expect(first.async).toBeTruthy();
				expect(first.diff).toStrictEqual({ state1: { a: [1, 2] } });

				const last = diffs[1];
				expect(last.asyncOrigin).toEqual(first.id);
				expect(last.diff).toStrictEqual({ state1: { a: [2, 3] } });
			})
	})

	test('it should tag subDiffs as async and link to resolution diff', () => {
		const reason = 'my-reason';
		const innerReason = 'my-inner-reason';
		return new Promise<void>(resolve => {
			setState(reason, () => {
				state.a++;
				setState(
					innerReason,
					() => {
						state.a++;
						return Promise.resolve(9);
					},
					resolvedValue => {
						state.a = resolvedValue;
						resolve();
					}
				);
				state.a++;
			});
		})
			.then(() => {
				const diffs = diffxInternals.getDiffs();
				expect(diffs.length).toEqual(2);
				const first = firstArrayItem(diffs);
				const firstSubDiff = singleArrayItem(first.subDiffEntries);
				expect(firstSubDiff.async).toBeTruthy();
				expect(firstSubDiff.diff).toStrictEqual({ state1: { a: [2, 3] } });

				const last = lastArrayItem(diffs);
				expect(last.asyncOrigin).toEqual(firstSubDiff.id);
				expect(last.diff).toStrictEqual({ state1: { a: [4, 9] } });
			})
	})
})