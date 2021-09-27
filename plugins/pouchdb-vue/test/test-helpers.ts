import PouchDB from 'pouchdb';
import { _test_teardown } from '../src';
import { diffxInternals } from '@diffx/core';
import { mount } from '@vue/test-utils';
import { PouchDbWithLiveFind } from '../src/utils/get-db';

declare global {
	var db: PouchDbWithLiveFind
}

export function setupTests(dbName: string) {
	beforeAll(() => {
		global.db = new PouchDB(dbName) as PouchDbWithLiveFind;
		return global.db.info();
	})

	beforeEach(() => {
		_test_teardown();
		diffxInternals._deleteAllDiffs();
		return global.db.allDocs()
			.then(docs => Promise.all(docs.rows.map(r => global.db.remove(r.id, r.value.rev))))
	});

	afterAll(() => global.db.destroy());
}

export function getLatestEmittedValue(wrapper: any, eventName: string): any {
	const emitVal = (wrapper.emitted(eventName) || []).slice(-1);
	return (emitVal[0] || [])[0];
}

export function whenComponentEmits(wrapper: any, eventName: string, runUntil: (val: any) => boolean): Promise<any> {
	return new Promise<any>(resolve => {
		const interval = setInterval(() => {
			const latestEmitted = getLatestEmittedValue(wrapper, eventName);
			if (runUntil(latestEmitted)) {
				clearInterval(interval);
				resolve(latestEmitted);
			}
		}, 15);
	})
}

export function setupComponent(setupFunc: (props?: any, ctx?: any) => any) {
	return mount({
		template: '<p></p>',
		setup: setupFunc
	});
}