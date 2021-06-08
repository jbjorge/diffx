import { map } from 'rxjs/operators';
import { createState, setDiffxOptions, setState, watchState } from './index';

setDiffxOptions({ devtools: true, includeStackTrace: true });
const state = createState('hihi', { lol: { meh: 0 }, lal: [] as string[] });
const s2 = createState('hoho', { miip: 'moop', maap: ['hehehe'] })

watchState(() => [state.lal])
	.subscribe((f) => console.log(f));

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
