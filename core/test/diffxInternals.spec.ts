import { createState, destroyState, diffxInternals, setDiffxOptions, setState } from '../src';
import { addDiffListener, DiffEntry, removeDiffListener } from '../src/internals';

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
	diffxInternals._deleteAllDiffs();
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
		setState('1', () => {});
		setState('2', () => {});
		removeDiffListener(listenerId);
		setState('3', () => {});
		expect(callCount).toEqual(2);
	})
});
test.todo('commit');
test.todo('replaceState');
test.todo('lockState');
test.todo('unlockState');
test.todo('pauseState');
test.todo('unpauseState');
test.todo('getStateSnapshot');
test.todo('getDiffs');