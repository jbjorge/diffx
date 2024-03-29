import { duplicateNamespace, replacingStateForNamespace } from '../src/console-messages';
// @ts-ignore
import { createState, destroyState, setDiffxOptions } from '../src';
import { mockStorage } from './mock-storage';
import { _resetForDiffxTests } from '../src/internal-state';

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
})

test('it should throw if state is created with the same namespace more than once', () => {
	function createDuplicateNamespace() {
		createState(_namespace, {});
		createState(_namespace, {});
	}
	expect(createDuplicateNamespace).toThrowError(duplicateNamespace(_namespace));
})

test('it should warn (but not throw) if `devtools` is true and state is created with the same namespace more than once', () => {
	setDiffxOptions({ devtools: true });
	const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

	function createDuplicateNamespace() {
		createState(_namespace, {});
		createState(_namespace, {});
	}

	expect(createDuplicateNamespace).not.toThrow();
	expect(consoleSpy.mock.calls).toEqual([[replacingStateForNamespace(_namespace)]]);
	consoleSpy.mockRestore();
})
