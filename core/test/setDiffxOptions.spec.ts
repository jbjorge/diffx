import { createState, destroyState, diffxInternals, setDiffxOptions } from '../src';
import getPersistenceKey from '../src/get-persistence-key';
// @ts-ignore
import { mockStorage } from './mock-storage';

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
	diffxInternals._deleteAllDiffs();
	mockStorage.clear();
})

describe('createDiffs', () => {
	test('it should create diffs when createDiffs is true', () => {
		setDiffxOptions({ createDiffs: true });
		const noDiffs = diffxInternals.getDiffs();
		const state = createState(_namespace, { a: 1 });
		const diffs = diffxInternals.getDiffs();
		expect(noDiffs.length).toBeFalsy();
		expect(diffs.length).toBe(1);
	})

	test('it should not create diffs by default', () => {
		const noDiffs = diffxInternals.getDiffs();
		const state = createState(_namespace, { a: 1 });
		const diffs = diffxInternals.getDiffs();
		expect(noDiffs.length).toBe(0);
		expect(diffs.length).toBe(0);
	})
})

describe('includeStackTrace', () => {
	test('it should include stack trace in diffs when includeStackTrace is true', () => {
		setDiffxOptions({ createDiffs: true, includeStackTrace: true });
		const state = createState(_namespace, { a: 1 });
		const diffs = diffxInternals.getDiffs();
		expect(diffs.length).toBe(1);
		expect(diffs[0].stackTrace.trim()).toMatch(/^at Object\.createState.*/);
	})

	test('it should not include stack trace in diffs by default', () => {
		setDiffxOptions({ createDiffs: true });
		const state = createState(_namespace, { a: 1 });
		const diffs = diffxInternals.getDiffs();
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
