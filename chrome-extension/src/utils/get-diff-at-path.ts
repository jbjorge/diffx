import { DiffEntry } from '@diffx/core/dist/internals';

export function getDiffAtPath(rootDiff: DiffEntry, pathFragments: number[]) {
	return pathFragments.reduce((entry: DiffEntry, subIndex: number) => {
		if (!entry.subDiffEntries) {
			throw new Error('Failed to resolve sub-diffs.');
		}
		return entry.subDiffEntries[subIndex];
	}, rootDiff);
}