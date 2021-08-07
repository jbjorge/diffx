import { createState, diffxInternals, setDiffxOptions, setState } from '@diffx/core';

setDiffxOptions({
	devtools: true,
	includeStackTrace: true,
	maxNestingDepth: 100
});

// setup communication bridge
diffxInternals.addDiffListener((diff, commit) => {
	window.postMessage({ type: 'diffx_diff', diff: JSON.parse(JSON.stringify(diff)), commit }, window.location.origin);
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
	counter: 0
});

// setInterval(() => {
// 	setState(`set counter to ${s1.counter + 1}`, () => {
// 		s1.counter++;
// 		setState(`set counter to ${s1.counter + 1}`, () => s1.counter++);
// 	});
// }, 1000)

for (let i = 0; i < 3; i++) {
	setState(`set counter to ${s1.counter + 1}`, () => {
		s1.counter++;
		setState(`set counter to ${s1.counter + 1}`, () => s1.counter++);
	})
}

const s2 = createState('hoho', {
	meh: 1
})


for (let i = 0; i < 3; i++) {
	setState(`set counter to ${s1.counter + 1}`, () => {
		s1.counter++;
		setState(`set counter to ${s1.counter + 1}`, () => {
			s1.counter++;
			if (s1.counter === 10) {
				s2.meh++;
			}
		});
	})
}