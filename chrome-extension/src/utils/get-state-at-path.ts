import { patch, unpatch } from 'jsondiffpatch';
import jsonClone from './jsonClone';
import { DiffEntry } from '@diffx/core/dist/internals';
import { getDiffAtPath } from './get-diff-at-path';

export function getStateAtPath(diffs: DiffEntry[], currentState: any, path: number[]) {
	const rootIndex = path[0];
	const operation = rootIndex <= (diffs.length / 2) ? 'patch' : 'unpatch';
	if (operation === 'patch') {
		const startValue = {};
		const diffsUpUntilIndex = diffs.slice(0, rootIndex + 1);
		diffsUpUntilIndex.forEach(diffEntry => patch(startValue, diffEntry.diff));

		// unpatch subDiffs if applicable
		unpatchSubDiffs(startValue, diffsUpUntilIndex[diffsUpUntilIndex.length - 1], path.slice(1));

		return startValue;
	}
	const startValue = jsonClone(currentState);
	const diffList = diffs.slice(rootIndex + 1).reverse();
	diffList.forEach(diffEntry => unpatch(startValue, diffEntry.diff));

	// patch subDiffs if applicable
	unpatchSubDiffs(startValue, diffList[0], path.slice(1));

	return startValue;
}

function unpatchSubDiffs(currentState: any, diff: DiffEntry, pathFragments: number[], iteration = 0) {
	const index = pathFragments[0];
	if (index == null || !diff?.subDiffEntries) {
		return;
	}
	if (index > iteration) {
		unpatchSubDiffs(currentState, diff, [iteration], iteration++);
	}
	const subDiffEntry = diff.subDiffEntries[pathFragments[0]];
	patch(currentState, subDiffEntry.diff);
}