import { DiffEntry } from '@diffx/core/dist/internals';

export interface DecoratedDiffEntryType extends DiffEntry {
	isHighlightedByTrace?: boolean;
	diffReasons?: string[];
	diffKeys?: string[];
	asyncIds?: string[];
	watcherIds?: string[];
}