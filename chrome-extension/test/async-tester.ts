import { createState, diffxInternals, setDiffxOptions, setState, watchState } from '@diffx/core';

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
	names: ['hohoho'] as string[],
	counter: 0
});

const s2 = createState('brukerinfo', {
	navn: '',
	alder: 0
});

setState('l1', () => {
	s1.counter++;
	setState('l2', () => {
		s1.counter++;
		setState('l3', () => {
			s1.counter++;
			setState('l4', () => {
				s1.counter++;
			});
		});
	});
})

setState('hoho1', () => {
	s1.counter++;
	setState('hoho2', () => {
		s1.counter++;
		setState('hoho3', () => {
			s1.counter++;
		});
	});
	setState('hoho2', () => {
		s1.counter++;
		setState('hoho3', () => {
			s1.counter++;
		});
	});
	// s1.counter++;
})

let interval = setInterval(() => {
	if (s1.counter > 20) {
		clearInterval(interval);
	}
	setState('timer', () => s1.counter++);
}, 1000)

setState('garblblblbl1', () => {
	s1.counter++;
	setState('garblblblbl2', () => {
		s1.counter++;
		setState('garblblblbl3', () => {
			s1.counter++;
		});
	});
	setState('garblblblbl2', () => {
		s1.counter++;
		setState('garblblblbl3', () => {
			s1.counter++;
		});
	});
	s1.counter++;
})

setState('brukeren skreiv navnet sitt', () => {
	s2.navn = 'Joachim';
	setState(`${s2.navn} oppga alderen sin`, () => {
		s2.alder = 34;
	})
	s1.counter++;
})

// TESTING OTHER STUFF
// level 1
setState('level 1', () => {
	s1.names.push('1');

	// level 2
	setState('level 2', () => {
		s1.names.push('2');

		// level 3
		setState('level 3', () => {
			s1.names.push('3');
		});
	});
	setState('level 2 again', () => {
		s1.counter++;
	});
})

setState('lol', () => {
	s1.names.push('eoiraerao');
	setState(
		'heh',
		() => {
			s1.names.push('hohoho');
			return Promise.resolve();
		},
		value => {
			s1.names.push('1');
			setState(
				'this will reject',
				() => Promise.reject(),
				() => {},
				() => {s1.names.push('i rejected! :)')}
			)
			setState(
				'mipmip',
				() => {
					return new Promise(resolve => {
						setTimeout(resolve, 1000);
					})
				},
				() => {
					s1.names.push('mipmip');
				}
			)
		});
})
setState('hoh', () => s1.names.push('asodifjasdofijasdfij'))

// TEST NESTING AND WATCHING AND STUFF
watchState(() => s1.names, {
	onEachSetState: newValue => {
		if (newValue.length < 3) {
			setState('triggered by loopin onEachSetState', () => {
				s1.names.push('hihi')
			});
		}
	}
})
//
watchState(() => s1.counter, {
	onEachSetState: newValue => {
		setState('triggered by starting the loop', () => s1.names.push('hei'));
		if (s1.counter < 2) {
			setState('same level loop', () => {
				setState('awoisdjfoasdf', () => {})
				s1.counter++;
			})
		}
		setState('also me', () => {});
	}
})

setState('starting the loop', () => {
	// setState('same level as starting the loop', () => {});
	// setState('same level as starting the loop', () => {});
	setState('child of "starting the loop"', () => {});
	s1.counter++;
	// setState('same level as starting the loop', () => {
	// 	setState('lol', () => {})
	// });
	// setState('async test', () => Promise.resolve().then(() => setState('heh', () => s1.counter++)), () => s1.counter++);
})
