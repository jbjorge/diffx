import { createState, destroyState, setDiffxOptions, setState, watchState } from '../src';
import getPersistenceKey from '../src/get-persistence-key';
import { mockStorage } from './mock-storage';
import { maxDepthReached } from '../src/console-messages';
import { _resetForDiffxTests } from '../src/internal-state';
import { getDiffs } from '../src/internals/getDiffs';

const _namespace = 'state1';

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
	_resetForDiffxTests();
	mockStorage.clear();
	delete global['__DIFFX__'];
})

describe('createDiffs', () => {
	test('it should create diffs when createDiffs is true', () => {
		setDiffxOptions({ createDiffs: true });
		const noDiffs = getDiffs();
		const state = createState(_namespace, { a: 1 });
		const diffs = getDiffs();
		expect(noDiffs.length).toBeFalsy();
		expect(diffs.length).toBe(1);
	})

	test('it should not create diffs by default', () => {
		const noDiffs = getDiffs();
		const state = createState(_namespace, { a: 1 });
		const diffs = getDiffs();
		expect(noDiffs.length).toBe(0);
		expect(diffs.length).toBe(0);
	})
})

describe('includeStackTrace', () => {
	test('it should include stack trace in diffs when includeStackTrace is true', () => {
		setDiffxOptions({ createDiffs: true, includeStackTrace: true });
		const state = createState(_namespace, { a: 1 });
		const diffs = getDiffs();
		expect(diffs.length).toBe(1);
		expect(diffs[0].stackTrace.trim()).toMatch(/^at Object\.createState.*/);
	})

	test('it should not include stack trace in diffs by default', () => {
		setDiffxOptions({ createDiffs: true });
		const state = createState(_namespace, { a: 1 });
		const diffs = getDiffs();
		expect(diffs.length).toBe(1);
		expect(diffs[0].stackTrace).not.toBeDefined();
	})
})

describe('persistence', () => {
	test('it should throw if globally persistent with no global nor local persistenceLocation', () => {
		setDiffxOptions({ persistent: true });
		expect(() => createState(_namespace, { a: 1 })).toThrow();
	})

	test('it should throw if locally persistent with no global nor local persistenceLocation', () => {
		expect(() => createState(_namespace, { a: 1 }, { persistent: true })).toThrow();
	})

	test('it should do nothing if persistenceLocation is globally set, but persistence is false', () => {
		setDiffxOptions({ persistenceLocation: mockStorage });
		const initialState = { a: 1 };
		createState(_namespace, initialState);
		expect(mockStorage.getItem(getPersistenceKey(_namespace))).toBeUndefined();
	})

	test('it should do nothing if persistenceLocation is locally set, but persistence is false', () => {
		const initialState = { a: 1 };
		createState(_namespace, initialState, { persistenceLocation: mockStorage });
		expect(mockStorage.getItem(getPersistenceKey(_namespace))).toBeUndefined();
	})

	test('it should persist with global persistence and persistenceLocation', () => {
		setDiffxOptions({ persistent: true, persistenceLocation: mockStorage });
		const initialState = { a: 1 };
		createState(_namespace, initialState);
		expect(JSON.parse(mockStorage.getItem(getPersistenceKey(_namespace)))).toStrictEqual(initialState);
	})

	test('it should persist with global persistence and local persistenceLocation', () => {
		setDiffxOptions({ persistent: true });
		const initialState = { a: 1 };
		createState(_namespace, initialState, { persistenceLocation: mockStorage });
		expect(JSON.parse(mockStorage.getItem(getPersistenceKey(_namespace)))).toStrictEqual(initialState);
	})

	test('it should persist with local persistence and persistenceLocation', () => {
		setDiffxOptions({ persistent: false });
		const initialState = { a: 1 };
		createState(_namespace, initialState, { persistent: true, persistenceLocation: mockStorage });
		expect(JSON.parse(mockStorage.getItem(getPersistenceKey(_namespace)))).toStrictEqual(initialState);
	})

	test('it should persist with local persistence and global persistenceLocation', () => {
		setDiffxOptions({ persistenceLocation: mockStorage });
		const initialState = { a: 1 };
		createState(_namespace, initialState, { persistent: true });
		expect(JSON.parse(mockStorage.getItem(getPersistenceKey(_namespace)))).toStrictEqual(initialState);
	})
})

describe('maxNestingDepth', () => {
	test('it should throw if setState is nested more than the default max depth', () => {
		const state = createState(_namespace, { a: 0 });

		function createNestedState(depth = 0) {
			if (depth > 102) {
				return;
			}
			setState('looping the setState', () => {
				state.a++;
				createNestedState(depth + 1);
			});
		}

		expect(createNestedState).toThrowError(maxDepthReached(100));
	})

	test('it should throw if setState is nested more than the specified max depth', () => {
		setDiffxOptions({ maxNestingDepth: 10 });
		const state = createState(_namespace, { a: 0 });

		function createNestedState(depth = 0) {
			if (depth > 10) {
				return;
			}
			setState('looping the setState', () => {
				state.a++;
				createNestedState(depth + 1);
			});
		}

		expect(createNestedState).toThrowError(maxDepthReached(10));
	})
})

describe('devtools', () => {
	test('it should create diffs when devtools is true', () => {
		setDiffxOptions({ devtools: true });
		const noDiffs = getDiffs();
		const state = createState(_namespace, { a: 1 });
		const diffs = getDiffs();
		expect(noDiffs.length).toBeFalsy();
		expect(diffs.length).toBe(1);
	})

	test('it should expose diffx on global/window.__DIFFX__ when devtools is true', () => {
		// before interacting with diffx
		expect(global['__DIFFX__']).toBeUndefined();

		// after interacting with diffx
		setDiffxOptions({});
		expect(global['__DIFFX__']).toBeUndefined();

		// after devtools set to true
		setDiffxOptions({ devtools: true });
		expect(global['__DIFFX__']).toBeDefined();
		const exposedAPI = Object.keys(global['__DIFFX__']);
		expect(exposedAPI).toEqual([
			'createState',
			'setState',
			'watchState',
			'destroyState',
			'setDiffxOptions',
			'addDiffListener',
			'removeDiffListener',
			'commit',
			'replaceState',
			'lockState',
			'unlockState',
			'pauseState',
			'unpauseState',
			'undoState',
			'redoState',
			'getStateSnapshot',
			'getDiffs',
			'_resetForDiffxTests',
		])
	})
})