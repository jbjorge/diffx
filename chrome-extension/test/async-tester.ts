import { createState, diffxInternals, setDiffxOptions, setState, watchState } from '@diffx/core';

setDiffxOptions({
	devtools: true,
	includeStackTrace: true
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

watchState(() => s1.names.find(x => x === 'loololol'), {
	lazy: true,
	onEachChange: (newValue, oldValue) => {
		console.log(newValue, oldValue);
		if (newValue && s1.counter < 5) {
			setState('inside watcher', () => s1.counter++);
		}
	}
})

setState('hihiasdfasdf', () => s1.names.push('joda'));

setState('lol', () => {
	s1.names.push('mipmip');
	setState('hihi', () => {
		s1.counter++;
		s1.names.push('loololol');
		setState('asdofijasdf', () => {
			s1.names.push('hihihasdfihas');
		});
	});
	setState('asdofijasdf', () => {
		s1.counter++;
	});
})

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
