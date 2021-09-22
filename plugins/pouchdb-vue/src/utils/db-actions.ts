import { Doc } from './types';
import getDb from './get-db';

export async function dbPut<T extends Doc>(dbName: string, data: Partial<T>) {
	const doc = { ...data } as Doc;
	const db = getDb(dbName);
	return doc._id ? db.put(doc) : db.post(doc);
}