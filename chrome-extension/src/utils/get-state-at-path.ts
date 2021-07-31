import { patch, unpatch } from 'jsondiffpatch';
import jsonClone from './jsonClone';
import { DiffEntry } from '@diffx/core/dist/internals';
import { diffs, getDiffByPath } from './diff-indexer';

export function getStateAtPath(currentState: any, path: string) {
	const diffsCopy = jsonClone(diffs.value);
	const fragments = path.split('.').map(fragment => parseInt(fragment));
	const rootIndex = fragments[0];
	const operation = rootIndex <= (diffsCopy.length / 2) ? 'patch' : 'unpatch';
	if (operation === 'patch') {
		const startValue = {};
		const diffsUpUntilIndex = diffsCopy.slice(0, rootIndex + 1);
		diffsUpUntilIndex.forEach(diffEntry => patch(startValue, diffEntry.diff));

		// patch subDiff if applicable
		if (fragments.length > 1) {
			const subDiff = getDiffByPath(path);
			patch(startValue, subDiff.diff);
		}

		return startValue;
	}
	const startValue = jsonClone(currentState);
	const diffList = diffsCopy.slice(rootIndex + 1).reverse();
	diffList.forEach(diffEntry => unpatch(startValue, diffEntry.diff));

	// unpatch subDiffs if applicable
	if (fragments.length > 1) {
		// unpatch the outmost diff
		unpatch(startValue, diffsCopy[rootIndex].diff);
		// patch the subdiff
		patch(startValue, getDiffByPath(path).diff);
	}

	return startValue;
}
