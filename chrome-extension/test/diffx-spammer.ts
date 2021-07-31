import { createState, diffxInternals, setDiffxOptions, setState } from '@diffx/core';

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
const s1 = createState('dinnerGuests', { names: [] as string[] });
const s2 = createState('servings', { count: 0 });
const orderState = createState('upload info', {
	isOrdering: false,
	successfulOrders: 0,
	errorMessage: ''
})

setState('Add "Hanna" to dinnerGuests', () => {
	s1.names.push('Hanna');
});
setState('Add serving', () => {
	s2.count++;
})
setState('Add "Joachim" to dinnerGuests and add serving', () => {
	s1.names.push('Joachim');
	s2.count++;
})

// setState('setState inside setState', () => {
// 	setState('Add serving', () => {
// 		s2.count++;
// 		setState('Add serving', () => {
// 			s2.count++;
// 			setState('Add "Jan" to dinnerGuests', () => {
// 				s1.names.push('Jan');
// 				setState('Add serving', () => {
// 					s2.count++;
// 				})
// 			})
// 		})
// 	})
// 	setState('Add serving', () => {
// 		s2.count++;
// 	})
// })

// setState('setStateAsync (nested)', () => {
// 	setStateAsync(
// 		'Fetch existing table reservations',
// 		() => {
// 			orderState.errorMessage = '';
// 			orderState.successfulOrders = 0;
// 			orderState.isOrdering = true;
// 			return Promise.resolve(5);
// 		},
// 		orderedCount => {
// 			orderState.isOrdering = false;
// 			setStateAsync(
// 				'Upload food order',
// 				() => {
// 					orderState.isOrdering = true;
// 					orderState.successfulOrders = 0;
// 					return Promise.resolve()
// 				},
// 				() => {
// 					orderState.isOrdering = false;
// 					orderState.successfulOrders = 5;
// 				}
// 				)
// 		}
// 	)
// })
//
// setState('Other state changes while async is running', () => {});
// setState('Other state changes while async is running', () => {});
// setState('Other state changes while async is running', () => {});

//
const addPerson = function (name: string) {
	setState(name, () => {
		s1.names.push(name);
	});
}

const addPersonAsync = function (name: string) {
	setState(
		name,
		() => Promise.resolve(),
		() => s1.names.push(name)
	);
}

// setState('Async test', () => {
// 	setState('Level 1', () => {
// 		setState('Level 2', () => {
// 			addPersonAsync('Level 3')
// 		})
// 		addPersonAsync('Level 2 again');
// 	})
// })

// for (let i = 0; i < 50; i++) {
// 	setState('Update time', () => {
// 		s2.time = Date.now();
// 	})
// }

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