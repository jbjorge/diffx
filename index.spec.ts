import { createState, setState, stateOptions, watchState } from './index';

stateOptions.debug = true;
const state = createState('hihi', { lol: '', lal: [] });


watchState(() => state, newValue => console.log(newValue), { deep: true, immediate: true })

for (let i = 0; i < 10; i++) {
	setState('woot woot' + i, () => {
		state.lol = 'hehe' + i;
	})
}

// const state2 = createState('hoho', { ey: '' });
// console.log(state2);
// setState('yess', () => state2.ey = 'hohoho')
// console.log(state2);

// console.log(JSON.stringify(getDiffs(), null, 2));
