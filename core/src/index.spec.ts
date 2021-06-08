import { createState, setDiffxOptions, setState, watchState, diffxInternals } from './index';

setDiffxOptions({ createDiffs: true });
const state = createState('hihi', { lol: { meh: 0 }, lal: ['hhi'] as string[] });
// const s2 = createState('hoho', { miip: 'moop', maap: ['hehehe'] })

watchState(() => state.lol, {
	onChanged: (value) => console.log('On changed', value),
	// onEachChange: value => console.log('On each change', value)
});

const ssAsync = () => {
	setTimeout(() => {
		setState('async', () => {
			state.lol.meh = 15;
		})
	}, 100)
}

const x = () => setState('bcos', () => {
	state.lal.push('hihihi')
	state.lal.push('oijasdojasd');
	state.lal[0] = 'oiaja';
	state.lal[0] = 'YES!'
	state.lol.meh = 2;
	ssAsync();
})

setState('reson', () => {
	state.lal = [];
	state.lal.push('hehehehoasdjfaosij')
	x();
});

// console.log(JSON.stringify(diffxInternals.getDiffs(), null, 2));



// /// recursive tests
// const state: any = {};
//
// interface HistoryEntry {
// 	s: object,
// 	level: number;
// 	children: HistoryEntry[]
// }
//
// let setStateNestingLevel = -1;
// let previousLevel = 0;
// let hist: HistoryEntry[] = [];
// let paren = [hist];
// let current = hist;
// let children;
// function setState(reason, cb) {
// 	const level = ++setStateNestingLevel;
// 	let didMoveDown = false;
// 	if (level < previousLevel) {
// 		// moved up a level
// 		addParentLevelElement({
// 			level,
// 			s: null,
// 			children: []
// 		})
// 	} else if (level === previousLevel) {
// 		// back to same level
// 		addSameLevelElement({
// 			level,
// 			s: null,
// 			children: []
// 		});
// 	} else {
// 		// moved down a level
// 		addChildElement({
// 			level,
// 			s: null,
// 			children: []
// 		});
// 		didMoveDown = true;
// 	}
// 	let thisLevelObject = current[current.length - 1];
// 	previousLevel = level;
// 	cb();
// 	thisLevelObject.s = JSON.parse(JSON.stringify(state));
// 	setStateNestingLevel--;
// 	if (didMoveDown) {
// 		paren.pop();
// 	}
// }
//
// function addParentLevelElement(el) {
// 	const parentEl = paren[paren.length - 1];
// 	const parentChildren = parentEl[parentEl.length - 1].children;
// 	parentChildren.push(el);
// 	current = parentChildren;
// 	children = current[current.length - 1].children;
// }
//
// function addSameLevelElement(el) {
// 	current.push(el);
// 	children = current[current.length - 1].children;
// }
//
// function addChildElement(el) {
// 	children.push(el);
// 	current = children;
// 	paren.push(children);
// 	children = current[current.length - 1].children;
// }
//
// setState('0', () => {
// 	state.x = 'hei';
// 	state.y = 'hehe';
//
// 	setState('1', () => {
// 		state.y = 'hhi'
// 		setState('2', () => {
// 			state.x = 'yes';
// 		})
//
// 		state.x = 'hallo';
// 	})
// })
//
// console.log(JSON.stringify(hist, null, 2));
//
// /// recursive tests end