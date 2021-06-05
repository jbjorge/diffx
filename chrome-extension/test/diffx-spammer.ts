import {setDiffxOptions, diffxInternals, createState, setState} from '@diffx/core';

setDiffxOptions({
	devtools: true,
	includeStackTrace: true
});

// setup communication bridge
diffxInternals.addDiffListener((diff, commit) => {
	window.postMessage({type: 'diffx_diff', diff, commit}, window.location.origin);
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
const s1 = createState('s1', { time: 0 });

const Test = createState('Test', { time: 0 });
const TestX2 = createState('TestX2', {
	isTrue: true
});
const rState = createState('Testx3', { a: 1 });
setState('Recursion test', () => {
	rState.a++;
	setState('Level 1', () => {
		Test.time = 15;
		setState('Level 2', () => {
			s1.time++;
			setState('Level 3', () => {
				s1.time++;
				setState('Level 4', () => {
					s1.time++;
				})
			})
		})
	})
	setState('Level 1 again', () => {})
	rState.a++;
})

setState('Update time', () => {
	Test.time = Date.now();
})
setState('Update time', () => {
	Test.time = Date.now();
})
setState('Update time', () => {
	Test.time = Date.now();
})
// setInterval(() => {
// setState('Update time', () => {
// 	Test.time = Date.now();
// })
// 	if (Math.floor((Test.time / 1000)) % 3 === 0) {
// 		setState('Update other state', () => {
// 			TestX2.isTrue = !TestX2.isTrue;
// 			s1.time++;
// 		})
// 	}
// }, 3000);