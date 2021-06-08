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
const s1 = createState('s1', { time: 0 });
const people = createState('people', { names: [] as string[] });
const asyncStateTest = createState('asyncTest', { time: '' });
const Test = createState('Test', { time: 0 });
const TestX2 = createState('TestX2', {
	isTrue: true
});
const rState = createState('Testx3', { a: 1 });
// setState('Recursion test', () => {
// 	rState.a++;
// 	setState('Level 1', () => {
// 		Test.time = 15;
// 		setState('Level 2', () => {
// 			s1.time++;
// 			setState('Level 3', () => {
// 				s1.time++;
// 				setState('Level 4', () => {
// 					s1.time++;
// 				})
// 			})
// 		})
// 	})
// 	setState('Level 1 again', () => {})
// 	rState.a++;
// })
//
// setState('Get data async', async () => {
// 	setState('Async start', () => {
// 		asyncStateTest.time = 'heihei';
// 	});
// 	const endTime = await new Promise<string>(resolve => {
// 		setTimeout(() => resolve(asyncStateTest.time + 1), 1000);
// 	})
// 	return () => {
// 		asyncStateTest.time = endTime;
// 	};
// })
//
//
// const addPerson = function(name: string) {
// 	setState('add person', () => {
// 		people.names.push(name);
// 	});
// }
//
// const addPersonAsync = function(name: string) {
// 	setState('add person async', async () => {
// 		await new Promise(resolve => setTimeout(resolve, 1000));
// 		return () => {
// 			people.names.push(name);
// 		};
// 	});
// }
//
// setState('add people', () => {
// 	addPerson('1');
// 	addPersonAsync('2');
// 	addPerson('3');
// 	setState('add person 4', () => addPersonAsync('4'));
// 	addPersonAsync('5');
// 	addPerson('6');
// })
// // addPersonAsync('Joachim');
//
//
// setState('Update time', () => {
// 	Test.time = Date.now();
// })
// setState('Update time', () => {
// 	Test.time = Date.now();
// })
// setState('Update time', () => {
// 	Test.time = Date.now();
// })
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

for (let i = 0; i < 10; i++) {
	setState('upd', () => {
		s1.time = i;
		setState('inner upd', () => {
			Test.time = i;
			setState('inner upd', () => {
				Test.time = i;
				setState('inner upd', () => {
					Test.time = i;
				})
			})
		})
	})
}