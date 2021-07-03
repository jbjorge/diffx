import { createState, diffxInternals, setDiffxOptions, setState, setStateAsync } from '@diffx/core';

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
const s1 = createState('test', { names: [] as string[] });

setState('lol', () => {
	setStateAsync(
		'heh',
		() => {
			return Promise.resolve();
		},
		value => {
			s1.names.push('1');
			console.log('before', Date.now());
			return setStateAsync('mipmip',
				() => {
					return new Promise(resolve => {
						setTimeout(resolve, 1000);
					})
				},
				() => {
					s1.names.push('mipmip');
					console.log('mid', Date.now())
				}
			)
		})
		.then(() => {
			console.log('end', Date.now());
			return setState('trololol', () => {
				return setStateAsync('aosidjfasdf',
					() => new Promise(resolve => setTimeout(resolve, 500)),
					() => {
						s1.names.push('asdofiasdf');
						console.log('wat');
					}
				)
			})
		})
		.then(() => console.log('wohoo'))
})
