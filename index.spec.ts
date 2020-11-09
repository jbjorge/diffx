import { createState, getDiffs, setState, stateOptions, watchState } from './src/index';

stateOptions.debug = true;
const state = createState('hihi', { lol: '', lal: [] });

watchState(() => state, (newValue) => {
	console.log(newValue);
}, { immediate: true });


for (let i = 0; i < 10; i++) {
	setState('woot woot' + i, () => {
		state.lol = 'hehe' + (i - i);
		state.lal.push(i);
	})
}

// console.log(JSON.stringify(getDiffs(), null, 2));
