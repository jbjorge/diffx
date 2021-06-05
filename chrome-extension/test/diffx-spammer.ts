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

const state = createState('Test', { time: 0 });
const state2 = createState('TestX2', {
	isTrue: true
});
setInterval(() => {
	setState('Update time', () => {
		state.time = Date.now();
	})
	if (Math.floor((state.time / 1000)) % 3 === 0) {
		setState('Update other state', () => {
			state2.isTrue = !state2.isTrue;
			s1.time++;
		})
	}
}, 1000);