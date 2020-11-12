import { createState, getDiffs, pauseState, setState, stateOptions, unPauseState, watchState } from './index';

stateOptions.debug = true;
const state = createState('hihi', { lol: '', lal: [] });
const state2 = createState('MIMIMIMIMI', { lol: '', lal: [] });

watchState(() => state, (newValue) => {
	console.log('state1', newValue);
}, { immediate: true });

watchState(() => state2.lal, (newValue) => {
	console.log('state2', newValue);
}, { immediate: true });


for (let i = 0; i < 3; i++) {
	setState('woot woot' + i, () => {
		state.lol = 'hehe' + i;
		state.lal.push(i * 7);
		state2.lal.push(i);
	})
}

pauseState();

setState('wiih', () => {
	state.lol = 'momomomomomomooooo'
});

unPauseState();

setState('wiih', () => {
	state.lol = 'unpaised'
});

// console.log(JSON.stringify(getDiffs(), null, 2));
