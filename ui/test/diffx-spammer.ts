import {setDiffxOptions, diffxInternals, createState, setState} from '@diffx/rxjs';

setDiffxOptions({debug:
		{includeStackTrace: true, devtools: true}})

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
const state = createState('test', { time: 0 });
const state2 = createState('test2', {
	isTrue: true
});
setInterval(() => {
	setState('Update time', () => {
		state.time = Date.now();
	})
	if (Math.floor((state.time / 1000)) % 3 === 0) {
		setState('Update other state', () => {
			state2.isTrue = !state2.isTrue;
		})
	}
}, 1000);