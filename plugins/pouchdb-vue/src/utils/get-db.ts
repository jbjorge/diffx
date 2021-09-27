import PouchDB from 'pouchdb';
import pdbFind from 'pouchdb-find';
import { Emitter, liveFind, RequestDef } from '../live-find';
import { internalState } from './internal-state';
const dbPool: DbPool = {};

export type PouchDbWithLiveFind = PouchDB.Database & {
	liveFind: (query: Partial<RequestDef>) => Emitter;
	type: string;
};
interface DbPool {
	[dbName: string]: PouchDbWithLiveFind
}

let pdbInitialized = false;
let PDB: PouchDB.Static;
export default function getDb(dbName: string) {
	if (!pdbInitialized) {
		if (!internalState.Pouch) {
			PDB = PouchDB;
			PDB.defaults({ auto_compaction: true });
		} else {
			PDB = internalState.Pouch;
		}
		PDB.plugin(pdbFind);
		// @ts-ignore
		PDB.plugin({ liveFind });
		pdbInitialized = true;
	}
	if (dbPool[dbName]) {
		return dbPool[dbName];
	}
	dbPool[dbName] = new PDB(dbName) as PouchDbWithLiveFind;

	// removes console warning
	dbPool[dbName].type = '';
	return dbPool[dbName];
}
