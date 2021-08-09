import { patch, unpatch } from 'jsondiffpatch';
import jsonClone from './jsonClone';
import { diffs, getDiffByPath, latestState } from './diff-indexer';

export function getStateAtPath(path: string) {
	const diffsCopy = jsonClone(diffs.value);
	const fragments = path.split('.').map(fragment => parseInt(fragment));
	const rootIndex = fragments[0];
	const operation = rootIndex <= (diffsCopy.length / 2) ? 'patch' : 'unpatch';
	if (operation === 'patch') {
		const startValue = {};
		const diffsUpUntilIndex = diffsCopy.slice(0, rootIndex + 1);
		diffsUpUntilIndex.forEach(diffEntry => patch(startValue, diffEntry.diff));
		return startValue;
	}
	const startValue = jsonClone(latestState.value);
	if (fragments.length === 1 && rootIndex === diffs.value.length - 1) {
		return startValue;
	}
	const diffList = diffsCopy.slice(rootIndex + 1).reverse();
	diffList.forEach(diffEntry => unpatch(startValue, diffEntry.diff));

	// subDiffs if applicable
	if (fragments.length > 1) {
		unpatch(startValue, diffsCopy[rootIndex].diff);
		// patch the subdiff
		patch(startValue, getDiffByPath(path).diff);
	}

	return startValue;
}
