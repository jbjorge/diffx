import { createState, getDiffs } from './index';

// const state = createState('meepmoop', { hello: '', deep: { things: [] } });
// state.hello = 'hihi';
// setTimeout(() => {
// 	// state.hello = 'moo';
// 	state.deep.things.push({ a: 'yes' })
// }, 1000)
//
// setTimeout(() => {
// 	// state.hello = 'moo';
// 	state.deep.things.push('yestest')
// }, 2000)

const state = createState('hihi', { lol: '', lal: [] });
// state.lol = 'hehe';
state.$set('I click button', () => {
	state.lol = 'hehe';
	state.lal.push('hoh');
	state.lal.push([{ mip: 'mop' }])
});
state.$set('i click button again', () => {
	state.lal[1] = 'what';
})
console.log(state);
console.log(JSON.stringify(getDiffs(), null, 2));