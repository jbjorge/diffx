import { Doc } from './types';
import getDb from './get-db';
import PromiseQueue from './Promise-queue';

const promiseQueue = new PromiseQueue();

export async function dbPut<T extends Doc>(dbName: string, data: Partial<T>) {
	const doc = { ...data } as Doc;
	const db = getDb(dbName);
	return promiseQueue.add(doc._id ? db.put(doc) : db.post(doc));
}
