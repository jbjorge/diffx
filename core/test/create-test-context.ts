import { createState, destroyState, setDiffxOptions } from '../src';
import { _resetForDiffxTests } from '../src/internal-state';

const namespace = 'diffxInternals-test-namespace';
let state: { a: number, b: string };
let watchers: any[] = [];

export interface TestContext {
	state: typeof state,
	namespace: string,
	watchers: any[]
}

export function createTestContext(): TestContext {
	setDiffxOptions({
		createDiffs: true,
		maxNestingDepth: 100,
		persistenceLocation: null,
		devtools: false,
		persistent: false,
		includeStackTrace: false
	});
	watchers.forEach(unwatch => unwatch());
	watchers = [];
	destroyState(namespace);
	_resetForDiffxTests();
	delete global['__DIFFX__'];
	state = createState(namespace, { a: 0, b: 'hi' });
	return { state, watchers, namespace };
}