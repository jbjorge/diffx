import { createState, diffxInternals, setDiffxOptions, setState, watchState } from '@diffx/core';

setDiffxOptions({
	devtools: true,
	includeStackTrace: true,
	maxNestingDepth: 100
});

// setup communication bridge
diffxInternals.addDiffListener((diff, commit) => {
	window.postMessage({ type: 'diffx_diff', diff, commit }, window.location.origin);
});

window.addEventListener('message', evt => {
	if (evt.data.isSpammerResponse) {
		return;
	}
	if (evt.data.func) {
		// @ts-ignore
		let result = diffxInternals[evt.data.func](evt.data.payload);
		if (evt.data.id) {
			window.postMessage({
				id: evt.data.id,
				payload: result,
				isSpammerResponse: true
			}, window.location.origin);
		}
	}
});

// spam
const s1 = createState('test', {
	names: ['hohoho'] as string[],
	counter: 0
});

// watchState(() => s1.names, {
// 	onEachSetState: (newValue, oldValue) => {
// 		console.log(newValue, oldValue);
// 		if (!oldValue?.includes('2') && newValue.includes('2')) {
// 			setState('when level 2', () => {
// 				s1.names.push('when level 2');
// 				setState('when inner', () => {});
// 			});
// 		}
// 	}
// })

watchState(() => s1.counter, {
	// onSetStateDone: (newValue, oldvalue) => {
	// 	console.log(newValue, oldvalue);
	// 	if (s1.counter < 15) {
	// 		setState('loopin onSetStateDone', () => s1.counter++);
	// 	}
	// },
	onEachSetState: newValue => {
		if (s1.counter < 10) {
			setState('loopin onEachSetState', () => s1.names.push(s1.counter.toString()));
		}
	},
	// onEachValueUpdate: newValue => {
	// 	if (s1.counter < 5) {
	// 		setState('loopin onEachValueUpdate', () => s1.counter++);
	// 	}
	// }
})

setState('starting the loop', () => {
	s1.counter++;
	setState('async test', () => Promise.resolve().then(() => setState('heh', () => s1.counter++)), () => s1.counter++);
})

// level 1
// setState('level 1', () => {
// 	s1.names.push('1');
//
// 	// level 2
// 	setState('level 2', () => {
// 		s1.names.push('2');
//
// 		// level 3
// 		setState('level 3', () => {
// 			s1.names.push('3');
// 		});
// 	});
// 	setState('level 2', () => {
// 		s1.counter++;
// 	});
// })

// setState('lol', () => {
// 	setState(
// 		'heh',
// 		() => {
// 			s1.names.push('hohoho');
// 			return Promise.resolve();
// 		},
// 		value => {
// 			s1.names.push('1');
// 			setState(
// 				'mipmip',
// 				() => {
// 					return new Promise(resolve => {
// 						setTimeout(resolve, 1000);
// 					})
// 				},
// 				() => {
// 					s1.names.push('mipmip');
// 				}
// 			)
// 		});
// })
