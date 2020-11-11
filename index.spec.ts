import { createState, getDiffs, setState, stateOptions, watchState } from './index';

stateOptions.debug = true;
const state = createState('hihi', { lol: '', lal: [] });
const state2 = createState('MIMIMIMIMI', { lol: '', lal: [] });

watchState(() => state, (newValue) => {
	console.log(newValue);
}, { immediate: true });

watchState(() => state2, (newValue) => {
	console.log('state2', newValue);
}, { immediate: true });


for (let i = 0; i < 10; i++) {
	setState('woot woot' + i, () => {
		state.lol = 'hehe' + i;
		// state.lal.push(i);
		state2.lal.push(i);
	})
}

console.log(JSON.stringify(getDiffs(), null, 2));
