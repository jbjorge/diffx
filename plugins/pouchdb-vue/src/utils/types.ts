import type PouchDB from 'pouchdb-browser';

interface InnerSelector extends PouchDB.Find.CombinationOperators {
	// @ts-ignore
	[field: string]: InnerSelector | InnerSelector[] | PouchDB.Find.ConditionOperators;
}
export type Selector<T> = { [P in keyof T]?: T[P] | PouchDB.Find.ConditionOperators } | InnerSelector;

export interface Doc {
	readonly _id: string;
	readonly _rev?: string;
}

export interface StateQuery<T> {
	selector: () => Selector<T>;
	fields?: (keyof T)[];
	sort?: any;
	skip?: string | number;
	limit?: string | number;
}

export interface UndoableDoc {
	_undo: (steps?: number) => void;
	_redo: (steps?: number) => void;
}