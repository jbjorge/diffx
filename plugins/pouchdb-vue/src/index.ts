import { Emitter, liveFind, RequestDef } from './live-find';
import getDb from './utils/get-db';
import { createState, destroyState, setDiffxOptions, setState, watchState } from '@diffx/core';
import { Doc, Selector, StateQuery, UndoableDoc } from './utils/types';
import PouchDB from 'pouchdb-browser';
import { onUnmounted, watch } from 'vue';
import { internalState } from './utils/internal-state';
import { dbPut } from './utils/db-actions';
import { diff } from 'jsondiffpatch';

interface PouchOptions {
	PouchDb?: PouchDB.Static
}

export const setDiffxPouchdbOptions = (options: PouchOptions) => {
	internalState.Pouch = options.PouchDb;
	internalState.Pouch.plugin(liveFind);
}

export function createPouchDbState<DocType>(dbName: string, id: string, initialState: DocType): DocType & Doc & UndoableDoc;
export function createPouchDbState<DocType extends Doc>(dbName: string, query: StateQuery<DocType>): ((DocType & UndoableDoc)[]) & UndoableDoc;
export function createPouchDbState<DocType extends Doc>(dbName: string, idOrQuery?: StateQuery<DocType> | string, initialState?: Omit<DocType, keyof Doc>) {
	if (typeof idOrQuery === 'string'){
		return createDocState<DocType>(dbName, idOrQuery, initialState);
	}
	return createQueryState<DocType>(dbName, idOrQuery);
}

let idStreams = {} as {
	[id: string]: {
		state: any;
		stream: { cancel: () => void };
		maybeTeardown: () => void;
		members: Symbol[]
	}
};

const idToRevMap: { [id: string]: string } = {};

function createDocState<DocType extends Doc>(dbName: string, id: string, initialState: Omit<DocType, keyof Doc>): DocType {
	if (idStreams[id]) {
		const streamId = Symbol('doing the things');
		idStreams[id].members.push(streamId);
		onUnmounted(() => {
			idStreams[id].members = idStreams[id].members.filter(m => m !== streamId);
			idStreams[id].maybeTeardown();
		})
		return idStreams[id].state;
	}
	let updateIsFromDb = false;
	const db = getDb(dbName);
	const state = createState(id, {
		_id: '',
		...initialState
	} as DocType);
	// create the doc if it doesn't exist
	db.get(id)
		.catch(() => {
			return dbPut(dbName, { ...state, _id: id }).then(result => ({ _id: result.id }))
		})
		.then(doc => {
			idToRevMap[doc._id] = (doc as any)._rev;
			const stream = db.liveFind({
				selector: { _id: doc._id },
				aggregate: false
			} as RequestDef);
			stream.onUpdate((event) => {
				idToRevMap[event.doc._id] = event.doc._rev;
				const otherThanRevChanged = Object.keys(diff(state, event.doc) || {})
					.some(key => key !== '_rev');
				if (!otherThanRevChanged) {
					return;
				}
				updateIsFromDb = true;
				setState('@db-update', () => {
					delete event.doc._rev;
					Object.keys(event.doc)
						// @ts-ignore
						.forEach(key => state[key] = event.doc[key]);
				});
				updateIsFromDb = false;
			});
			const unwatch = watchState(() => state, {
				onEachSetState: newValue => {
					if (!updateIsFromDb) {
						dbPut(dbName, { ...newValue, _rev: idToRevMap[newValue._id] })
					}
				}
			})
			idStreams[id] = {
				state,
				stream,
				members: [],
				maybeTeardown: function () {
					if (!this.members.length) {
						this.stream.cancel();
						destroyState(id);
						delete idStreams[id];
						unwatch();
					}
				}
			};
		})
	onUnmounted(() => idStreams[id]?.maybeTeardown());

	return state;
}

function createQueryState<DocType extends Doc>(dbName: string, query: StateQuery<DocType>): DocType[] {
	let feed = { cancel: () => null } as Emitter;
	const db = getDb(dbName);
	let subUnWatchers = [] as (() => void)[];
	const queryString = JSON.stringify(query.selector());
	const state = createState(dbName + queryString, { docs: [] as DocType[] });
	const fields = (query.fields && !query.fields.includes('_id')) ? query.fields.concat('_id') : [];

	const unwatch = watch(
		query.selector,
		selector => {
			feed.cancel();
			feed = db.liveFind({ selector, fields } as RequestDef);
			feed.onUpdate(event => {
				subUnWatchers.forEach(unwatch => unwatch());
				subUnWatchers = [];

				setState('@db-update', () => {
					if (event.action === 'ADD') {
						state.docs.push(event.doc as DocType);
					} else {
						const index = state.docs.findIndex(doc => doc._id === event.id);
						if (event.action === 'UPDATE') {
							state.docs.splice(index, 1, event.doc as DocType);
						} else {
							state.docs.splice(index, 1);
						}
					}
				});
				state.docs.forEach(doc => {
					subUnWatchers.push(watchState(
						() => doc,
						newValue => dbPut(dbName, newValue)
					))
				})
			})
		},
		{ immediate: true }
	)

	onUnmounted(() => {
		feed.cancel();
		subUnWatchers.forEach(unwatch => unwatch());
		unwatch();
	})
	return state.docs;
}

export function _test_teardown() {
	for (let id in idStreams) {
		idStreams[id].maybeTeardown();
	}
}