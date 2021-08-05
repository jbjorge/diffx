import { createState, destroyState, diffxInternals, setDiffxOptions, setState, watchState } from '../src';
import { diff } from 'jsondiffpatch';
import { firstArrayItem, lastArrayItem, singleArrayItem } from './array-utils';

const _namespace = 'watchState-test-namespace';
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

test('it should be possible to provide a callback instead of options', () => {
	return new Promise(resolve => {
		watchState(() => _state.a, (newValue, oldValue) => {
			resolve({newValue, oldValue});
		});
		setState('triggering callback', () => _state.a = 100);
	})
		.then(result => {
			expect(result).toStrictEqual({newValue: 100, oldValue: 0});
		})
})

test('try to break trigger tracing', () => {
	return new Promise<void>(resolve => {
		let x, xx, y, yy, z;
		watchState(() => _state.a, {
			once: true,
			onEachValueUpdate: val => {
				setState('onEachValueUpdate 1', () => {
					setState('onEachValueUpdate 2', () => _state.b = 'xx');
					_state.b = 'x'
				});
				setState('onEachValueUpdate 4', () => {
					_state.b = 'xy'
				});
				x = true;
				negotiateResolve();
			},
			onEachSetState: val => {
				setState('onEachSetState 1', () => {
					_state.b = 'y'
					setState('onEachSetState 2', () => _state.b = 'yy');
				});
				y = true;
				negotiateResolve();
			},
			onSetStateDone: val => {
				setState('onSetStateDone', () => _state.b = 'z');
				z = true;
				negotiateResolve();
			}
		});

		const unwatch1 = watchState(() => _state.b, {
			onEachValueUpdate: val => {
				if (val !== 'x' && val !== 'xx') {
					return;
				}
				setState('onEachValueUpdate 3', () => _state.b = 'xxx');
				xx = true;
				unwatch1();
				negotiateResolve();
			}
		})

		const unwatch2 = watchState(() => _state.b, {
			onEachSetState: val => {
				if (val === 'yy') {
					setState('onEachSetState 3', () => _state.b = 'yyy');
					yy = true;
					unwatch2();
				}
			}
		})

		function negotiateResolve() {
			if (x && xx && y && yy && z) {
				resolve();
			}
		}

		setState('trigger time', () => _state.a++);
		setState('after trigger', () => _state.b = 'after all triggers have run');
	})
		.then(() => {
			const diffs = diffxInternals.getDiffs();

			diffs.forEach(diff => {
				expect(diff.reason.length).toBeGreaterThanOrEqual(1);
				expect(diff.id.length).toEqual(20);
				expect(diff.diff).toBeDefined();
				expect(diff.timestamp).toBeDefined();
			})

			expect(diffs.length).toEqual(4);

			/********************************************/
			/****** INIT ********************************/
			/********************************************/
			expect(diffs[0].isGeneratedByDiffx).toBeTruthy();
			expect(diffs[0].subDiffEntries).toBeUndefined();
			expect(diffs[0].reason).toEqual('@init watchState-test-namespace');
			expect(diffs[0].asyncOrigin).toBeUndefined();
			expect(diffs[0].async).toBeUndefined();
			expect(diffs[0].triggeredByDiffId).toBeUndefined();

			/********************************************/
			/****** TRIGGER *****************************/
			/********************************************/
			expect(diffs[1].reason).toEqual('trigger time');
			expect(diffs[1].isGeneratedByDiffx).toBeUndefined();
			expect(diffs[1].asyncOrigin).toBeUndefined();
			expect(diffs[1].async).toBeUndefined();
			expect(diffs[1].triggeredByDiffId).toBeUndefined();

			/********************************************/
			/****** ON EACH VALUE UPDATE ****************/
			/********************************************/
			expect(diffs[1].subDiffEntries.length).toEqual(3);
			const d1sub1 = diffs[1].subDiffEntries[0];
			expect(d1sub1.reason).toEqual('onEachValueUpdate 1');
			expect(d1sub1.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub1.asyncOrigin).toBeUndefined();
			expect(d1sub1.async).toBeUndefined();
			expect(d1sub1.triggeredByDiffId).toEqual(diffs[1].id);

			const d1sub1sub1 = singleArrayItem(d1sub1.subDiffEntries);
			expect(d1sub1sub1.reason).toEqual('onEachValueUpdate 2');
			expect(d1sub1sub1.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub1sub1.asyncOrigin).toBeUndefined();
			expect(d1sub1sub1.async).toBeUndefined();
			expect(d1sub1sub1.triggeredByDiffId).toBeUndefined();

			const d1sub1sub1sub1 = singleArrayItem(d1sub1sub1.subDiffEntries);
			expect(d1sub1sub1sub1.reason).toEqual('onEachValueUpdate 3');
			expect(d1sub1sub1sub1.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub1sub1sub1.asyncOrigin).toBeUndefined();
			expect(d1sub1sub1sub1.async).toBeUndefined();
			expect(d1sub1sub1sub1.triggeredByDiffId).toEqual(d1sub1sub1.id);
			expect(d1sub1sub1sub1.subDiffEntries.length).toStrictEqual(0);

			const d1sub2 = diffs[1].subDiffEntries[1];
			expect(d1sub2.reason).toEqual('onEachValueUpdate 4');
			expect(d1sub2.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub2.asyncOrigin).toBeUndefined();
			expect(d1sub2.async).toBeUndefined();
			expect(d1sub2.triggeredByDiffId).toEqual(diffs[1].id);
			expect(d1sub2.subDiffEntries.length).toStrictEqual(0);

			/********************************************/
			/****** ON EACH SETSTATE ********************/
			/********************************************/
			const d1sub3 = diffs[1].subDiffEntries[2];
			expect(d1sub3.reason).toEqual('onEachSetState 1');
			expect(d1sub3.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub3.asyncOrigin).toBeUndefined();
			expect(d1sub3.async).toBeUndefined();
			expect(d1sub3.triggeredByDiffId).toEqual(diffs[1].id);

			const d1sub3sub1 = singleArrayItem(d1sub3.subDiffEntries);
			expect(d1sub3sub1.reason).toEqual('onEachSetState 2');
			expect(d1sub3sub1.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub3sub1.asyncOrigin).toBeUndefined();
			expect(d1sub3sub1.async).toBeUndefined();
			expect(d1sub3sub1.triggeredByDiffId).toBeUndefined();
			expect(d1sub3sub1.subDiffEntries.length).toStrictEqual(1);

			const d1sub3sub1sub1 = singleArrayItem(d1sub3sub1.subDiffEntries);
			expect(d1sub3sub1sub1.reason).toEqual('onEachSetState 3');
			expect(d1sub3sub1sub1.isGeneratedByDiffx).toBeUndefined();
			expect(d1sub3sub1sub1.asyncOrigin).toBeUndefined();
			expect(d1sub3sub1sub1.async).toBeUndefined();
			expect(d1sub3sub1sub1.triggeredByDiffId).toEqual(d1sub3sub1.id);
			expect(d1sub3sub1sub1.subDiffEntries.length).toStrictEqual(0);

			/********************************************/
			/****** ON SETSTATE DONE ********************/
			/********************************************/
			expect(diffs[2].reason).toEqual('onSetStateDone');
			expect(diffs[2].isGeneratedByDiffx).toBeUndefined();
			expect(diffs[2].asyncOrigin).toBeUndefined();
			expect(diffs[2].async).toBeUndefined();
			expect(diffs[2].triggeredByDiffId).toEqual(diffs[1].id);
			expect(diffs[2].subDiffEntries.length).toStrictEqual(0);

			expect(diffs[3].reason).toEqual('after trigger');
			expect(diffs[3].isGeneratedByDiffx).toBeUndefined();
			expect(diffs[3].asyncOrigin).toBeUndefined();
			expect(diffs[3].async).toBeUndefined();
			expect(diffs[3].triggeredByDiffId).toBeUndefined();
			expect(diffs[3].subDiffEntries.length).toStrictEqual(0);
		})
})
