import { createState, diffxInternals, setDiffxOptions, setState } from '@diffx/core';

setDiffxOptions({
	devtools: true,
	includeStackTrace: false
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
const s1 = createState('testState', { time: 0 });
const s2 = createState('timer', { time: 0 });

function updateTime() {
	setState('One second has passed', () => {
		s2.time = Date.now();
	})
}

setInterval(updateTime, 1000);

setState('Wrapping test', () => {
	s1.time++;
	setState('Level 1', () => {
		s1.time = 15;
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
	setState('Level 1 again', () => {
		s1.time++;
	})
})

const addPerson = function (name: string) {
	setState(name, () => {
		s1.time++;
		;
	});
}

const addPersonAsync = function (name: string) {
	setState(name, async () => {
		await new Promise(resolve => setTimeout(resolve, 1000));
		return () => {
			s1.time++;
			;
		};
	});
}

setState('Async test', () => {
	setState('Level 1', () => {
		s1.time++;
		setState('Level 2', () => {
			s1.time++;
			addPersonAsync('Level 3')
		})
		addPersonAsync('Level 2 again');
	})
})
// setInterval(() => {
// setState('Update time', () => {
// 	s1.time = Date.now();
// })
// 	if (Math.floor((s1.time / 1000)) % 3 === 0) {
// 		setState('Update other state', () => {
// 			s4.isTrue = !s4.isTrue;
// 			s1.time++;
// 		})
// 	}
// }, 3000);

// for (let i = 0; i < 10; i++) {
// 	setState('upd', () => {
// 		s1.time = i;
// 		setState('inner upd', () => {
// 			s1.time = i;
// 			setState('inner upd', () => {
// 				s1.time = i;
// 				setState('inner upd', () => {
// 					s1.time = i;
// 				})
// 			})
// 		})
// 	})
// }