import { createId } from './create-id';

interface PromiseWithId<T> extends Promise<T> {
	promiseChainId: string;
}

export default class PromiseQueue {
	private queue: PromiseWithId<any>[];

	constructor() {
		this.queue = [];
	}

	add<T>(promise: Promise<T>): Promise<T> {
		const promiseChainId = createId();
		(promise as PromiseWithId<T>).promiseChainId = promiseChainId;
		this.queue.push(promise as unknown as PromiseWithId<T>);
		return Promise.all(this.queue).then(results => {
			const index = this.queue.findIndex(p => p.promiseChainId === promiseChainId);
			this.queue.splice(index, 1);
			return results[results.length - 1];
		});
	}
}
