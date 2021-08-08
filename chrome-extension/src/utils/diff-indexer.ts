import { DiffEntry } from '@diffx/core/dist/internals';
import { reactive, readonly, ref, Ref } from 'vue';
import { getStateSnapshot } from './diffx-bridge';

type IdToPathMap = { [id: string]: string };

export const diffIdToPathMap: IdToPathMap = reactive({});
const _diffs: Ref<DiffEntry[]> = ref([]);
export const diffs = readonly(_diffs) as unknown as Ref<DiffEntry[]>;
export const currentState = ref({});
export const latestState = ref({});

function onNewDiff({ data }: { data: any }) {
	if (!data || data.type !== 'diffx_diff') {
		return;
	}
	const { diff, commit }: { diff: DiffEntry, commit?: boolean } = data;
	if (commit) {
		_diffs.value = [diff];
		Object.keys(diffIdToPathMap).map(key => {
			delete diffIdToPathMap[key];
		})
		updateIdToPathMap(diff);
	} else {
		_diffs.value.push(diff);
		updateIdToPathMap(diff);
	}
	updateCurrentState();
}

let snapshotCounter = 0;

function updateCurrentState() {
	const counter = ++snapshotCounter;
	getStateSnapshot().then(snapshot => {
		if (counter === snapshotCounter) {
			currentState.value = snapshot;
			latestState.value = snapshot;
		}
	});
}

function updateIdToPathMap(diff: DiffEntry) {
	Object.assign(diffIdToPathMap, getIdToPathMap(diff));
}

export function getDiffById(id: string) {
	const path = diffIdToPathMap[id];
	if (!path) {
		throw new Error(`Diff with id ${id} was not found`);
	}
	return getDiffByPath(path);
}

export function getDiffByPath(path: string) {
	if (!path) {
		throw new Error(`Diff with path ${path} was not found`);
	}
	const fragments = path.split('.');
	return getDiff(_diffs.value, fragments);
}

export function getDiffsByValuePath(path: string): string[] {
	const diffValueMap = createDiffValueMap();
	return Object.keys(diffValueMap)
		.filter(key => key.startsWith(path))
		.reduce((ids, key) => {
			return ids.concat(diffValueMap[key]);
		}, [] as string[])
		.filter((v, i, a) => a.indexOf(v) === i);
}

function createDiffValueMap() {
	function rKeys(o: any, path=""): any {
		if (!o || typeof o !== "object") return path;
		return Object.keys(o).map(key => rKeys(o[key], path ? [path, key].join(".") : key))
	}

	const objectPaths = (o: any) => { return rKeys(o).toString().split(",") }

	return diffs.value.reduce((m, diff) => {
		const paths = objectPaths(diff.diff) as string[];
		paths.forEach(p => {
			if (diff.isGeneratedByDiffx) {
				p = p.replace(/^(.+?)\.0(.*)/, '$1$2');
			}
			const ids = m[p] || [] as string[];
			m[p] = ids.concat(diff.id);
		})
		return m;
	}, {} as { [valuePath: string]: string[] })
}

/**
 * Returns a map of id -> diffId for the diff and all its sub-diffs
 */
function getIdToPathMap(diff: DiffEntry): IdToPathMap {
	const rootPath = (diffs.value.length - 1).toString();
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

function getDiff(diffs: DiffEntry[], fragments: string[]): DiffEntry {
	const diff = diffs[parseInt(fragments[0])];
	if (fragments.length === 1) {
		return diff;
	}
	return getDiff(diff.subDiffEntries || [], fragments.slice(1))
}


window.addEventListener('message', onNewDiff);