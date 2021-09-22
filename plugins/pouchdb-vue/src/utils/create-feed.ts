import getDb from './get-db';
import { RequestDef } from '../live-find';
import { StateQuery } from './types';

export default function<T, ReturnType = T[]>(dbName: string, query: StateQuery<T>) {
	const db = getDb(dbName);
	return db.liveFind(query as unknown as RequestDef);
}
