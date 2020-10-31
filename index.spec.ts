import { createState, mip } from './index';

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

const state = mip('hihi', { lol: '' });
// state.lol = 'hehe';
// @ts-ignore
// state.lol = { value: 'hehe', reason: 'BECAUSE'};
state.$set(state.lol, 'hehe', 'Clicked button');
console.log(state);