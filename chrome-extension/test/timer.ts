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
	counter: 0,
	loremParts: [] as string[]
});

const lorem = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'
	.split(' ');

for (let i = 0; i < 20; i++) {
	const indx = i > 9 ? Math.round(i/2) : i;
	setState(`Adding ${lorem[i]} to the list`, () => {
		console.log('changing', indx);
		s1.loremParts[indx] = lorem[i];
	})
}

// setInterval(() => {
// 	setState(`set counter to ${s1.counter + 1}`, () => {
// 		s1.counter++;
// 		if (s1.counter % 3 == 0) {
// 			setState('miip', () => {
// 				s1.hah++;
// 			})
// 		}
// 		setState(`set counter to ${s1.counter + 1}`, () => s1.counter++);
// 	});
// }, 1000)
