import { createState, destroyState, diffxInternals, setDiffxOptions, setState } from '../src';
import { addDiffListener, DiffEntry, removeDiffListener, unlockState } from '../src/internals';
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
})

describe('.replaceState()', () => {
	test('it should replace state', () => {
		const newState = { [_namespace]: { a: 1, b: 'hehe', c: 'lol' } };
		diffxInternals.replaceState(newState);
		const snapshot = diffxInternals.getStateSnapshot();
		expect(snapshot).toStrictEqual(newState);
	});

	test.todo('test watcher triggering');
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

test.todo('pauseState');
test.todo('unpauseState');
test.todo('getStateSnapshot');
test.todo('getDiffs');