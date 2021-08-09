import { DiffEntry } from '@diffx/core/dist/internals';

type IdToPathMap = { [id: string]: string };

/**
 * Returns a map of id -> diffId for the diff and all its sub-diffs
 */
export function getIdToPathMap(diffsIndex: number, diff: DiffEntry): IdToPathMap {
	const rootPath = diffsIndex.toString();
	return Object.assign({ [diff.id]: rootPath }, getPath(diff.subDiffEntries, rootPath))
}

function getPath(diffs: DiffEntry[] | undefined, path: string): IdToPathMap {
	const mapping: IdToPathMap = {};
	(diffs || []).forEach((diff, index) => {
		const subPath = `${path}.${index}`;
		mapping[diff.id] = subPath;
		Object.assign(mapping, getPath(diff.subDiffEntries, subPath));
	});
	return mapping;
}

/**
 * Returns the diff at the specified path
 */
export function getDiffAtPath(diffs: DiffEntry[], path: string) {
	const fragments = path.split('.');
	return getDiff(diffs, fragments);
}

function getDiff(diffs: DiffEntry[], fragments: string[]): DiffEntry {
	const diff = diffs[parseInt(fragments[0])];
	if (fragments.length === 1) {
		return diff;
	}
	return getDiff(diff.subDiffEntries || [], fragments.slice(1))
}
