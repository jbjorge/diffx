import { createState, setDiffxOptions, setState, watchState } from './index';

setDiffxOptions({ debug: { devtools: true } });
const state = createState('hihi', { lol: { meh: 0 }, lal: ['hhi'] as string[] });
const s2 = createState('hoho', { miip: 'moop', maap: ['hehehe'] })

watchState(() => state.lal, {
	onChanged: (value) => console.log('On changed', value),
	onEachChange: value => console.log('On each change', value)
});

setState('bcos', () => {
	state.lal.push('hihihi')
	state.lal.push('oijasdojasd');
	state.lal[0] = 'oiaja';
	state.lal[0] = 'YES!'
	state.lol.meh = 2;
})

setState('reson', () => {
	state.lal = [];
	state.lal.push('hehehehoasdjfaosij')
});
