import internalState from './internal-state';
import rootState from './root-state';
import { patch, unpatch } from 'jsondiffpatch';
import clone from './clone';

export function getStateAtIndex(index: number) {
	const lastDiffIndex = internalState.diffs.length - 1;
	if (index === lastDiffIndex) {
		return rootState;
	}
	const operation = index <= (lastDiffIndex / 2) ? 'patch' : 'unpatch';
	if (operation === 'patch') {
		const startValue = {};
		const diffs = internalState.diffs.slice(0, index + 1);
		diffs.forEach(diffEntry => patch(startValue, diffEntry.diff));
		return startValue;
	}
	const startValue = clone(rootState);
	const diffList = internalState.diffs.slice(index).reverse();
	diffList.forEach(diffEntry => unpatch(startValue, diffEntry.diff));
	return startValue;
}