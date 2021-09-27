import { createPouchDbState } from '../src';
import { setState, watchState } from '@diffx/core';
import { setupComponent, setupTests, whenComponentEmits } from './test-helpers';
import { Doc } from '../src/utils/types';

const dbName = 'test/db';
setupTests(dbName);

describe('create by id', () => {
	test('it should create the document if it does not exist', () => {
		const wrapper = setupComponent((props, ctx) => {
			const s = createPouchDbState(dbName, '1', {});
			watchState(
				() => s._id,
				id => ctx.emit('docUpdate', id)
			);
		});
		return whenComponentEmits(wrapper, 'docUpdate', val => val === '1');
	})

	test('it should not include _rev in the returned doc', () => {
		const wrapper = setupComponent((props, ctx) => {
			const s = createPouchDbState(dbName, '1', {});
			watchState(
				() => s,
				doc => ctx.emit('docUpdate', doc)
			);
		});
		return whenComponentEmits(wrapper, 'docUpdate', val => val._id)
			.then(val => {
				expect(val._rev).toBeUndefined()
			});
	})

	test('it should queue updates to the doc so they get appended in the correct order', () => {
		const arrayItems: number[] = [];
		const wrapper = setupComponent((props, ctx) => {
			const s = createPouchDbState(dbName, '1', { data: [] });
			watchState(
				() => s,
				doc => ctx.emit('docUpdate', doc)
			);
			for (let i = 0; i < 100; i++) {
				const n = Math.random();
				arrayItems.push(n);
				setState(`change ${i + 1}`, () => s.data.push(n));
			}
		});
		return whenComponentEmits(wrapper, 'docUpdate', val => val._id && val.data?.length === 100)
			.then(val => {
				return new Promise<number[]>(resolve => {
					setTimeout(() => {
						// Should be done by now, eyh?
						// Or maybe look for a different way to test this
						global.db.get(val._id)
							.then(doc => resolve((doc as any).data))
					}, 500);
				})
			})
			.then((data: number[]) => {
				expect(arrayItems).toStrictEqual(data);
			})
	})
})

interface TestData extends Doc {

}

describe('create by query', () => {
	test.todo('it should not create any documents');
	test.todo('it should return all results as an array');
	test.todo('it should mutate the database when an array item is mutated');
	test.todo('it should support fields?');
	test.todo('it should create new documents with the query as a validator if it is added to the array?');
	test.todo('am I overdoing it with the above features?');
});