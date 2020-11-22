import {
	createState, diffxInternals, setDiffxOptions, setState, watchState

} from './index';

setDiffxOptions({debug: {devtools: true}});
const state = createState('hihi', { lol: { meh: 0}, lal: [] });
const s2 = createState('hoho', {miip: 'moop', maap: ['hehehe']})
// const state2 = createState('asdf', { lol: '', lal: [] });

console.log(global["__DIFFX__"]);

watchState(() => [state, s2], (newValue) => {
	console.log('state1', newValue);
}, { immediate: true });

// watchState(() => state2.lal, (newValue) => {
// 	console.log('state2', newValue);
// }, { immediate: true });


for (let i = 0; i < 3; i++) {
	setState('woot woot' + i, () => {
		state.lol.meh = i + 7;
		state.lal.push(i * 7);
		// state2.lal.push(i);
	})
}

// setState('becus', () => {
// 	state.lol = 'meep'
// });
// console.log('before');
diffxInternals.replaceState({
	'hihi': { lol: { meh: 1 }, lal: []},
	'hoho': { miip: 'mep' }
})
diffxInternals.lockState();

for (let i = 0; i < 3; i++) {
	setState('woot woot' + i, () => {
		state.lol.meh = i + 7;
		state.lal.push(i * 7);
		// state2.lal.push(i);
	})
}
console.log('snaps1', diffxInternals.getStateSnapshot())
// replaceState({'hihi': { lol: { meh: 1 }, lal: [728345]}})
// console.log('after');

// pauseState();
//
// setState('wiih', () => {
// 	state.lol = 'momomomomomomooooo'
// });
//
// unPauseState();
//
// setState('wiih', () => {
// 	state.lol = 'unpaised'
// });

// console.log(JSON.stringify(getDiffs(), null, 2));
