import { createState, getDiffs } from './index';
import { watch } from 'vue';

const state = createState('hihi', { lol: '', lal: [] }, { debug: false });
watch(() => state, newValue => console.log(newValue), { deep: true, immediate: true, flush: 'sync' })
console.time('a')
for (let i = 0; i < 10; i++) {
	state.$set('woot woot', () => {
		state.lol = 'hehe' + i;
	});
}
console.timeEnd('a');

const state2 = createState('hoho', { ey: '' });
console.log(state2);
state2.$set('yess', () => { state2.ey = 'hehehe' });
console.log(state2);

console.log(JSON.stringify(getDiffs(), null, 2));
