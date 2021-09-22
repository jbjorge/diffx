import { Delta } from 'jsondiffpatch';

enum DiffActions {
	'CREATE'= 'CREATE',
	'UPDATE'= 'UPDATE',
	'DELETE'= 'DELETE',
	'UNDO'= 'UNDO',
	'REDO'= 'REDO'
}

export interface Diff {
	action: DiffActions,
	timestamp: number,
	diff: Delta,
	reason?: string,
}

export interface DtoBase {
	readonly _id: string;
	readonly _rev: string;
}

export interface DiffedDtoBase extends DtoBase {
	$diffs: Diff[]
}
