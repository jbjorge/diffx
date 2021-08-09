import './setup';
import { createState, setState, watchState } from '@diffx/core';

export const clickCounter = createState('click counter', { count: 0 });
export const users = createState('users', {
	isFetching: false,
	names: [] as string[],
	fetchErrorMessage: ''
});

setState('increment the counter', () => clickCounter.count++);

setState('Change the counter and add a user', () => {
	clickCounter.count++;
	if (clickCounter.count > 2) {
		clickCounter.count = 200;
	}
	users.names.push('John');
})

const addUser = (name: string) => setState('add user', () => users.names.push('John'));
const incrementCounter = () => setState('increment counter', () => clickCounter.count++);

setState('Change the counter and add a user', () => {
	incrementCounter();
	if (clickCounter.count > 2) {
		clickCounter.count = 200;
	}
	addUser('John');
})

setState(
	'fetch and update users',
	() => {
		// set state before the async work begins
		users.fetchErrorMessage = '';
		users.names = [];
		users.isFetching = true;
		// return the async work
		return Promise.resolve('Jeremy');
	},
	result => {
		// the async work succeeded
		users.names.push(result);
		users.isFetching = false;
	},
	(error: Error) => {
		// the async work failed
		users.fetchErrorMessage = error.message;
		users.isFetching = false;
	}
);
setState(
	'fetch and update users, but fail the request',
	() => {
		// set state before the async work begins
		users.fetchErrorMessage = '';
		users.names = [];
		users.isFetching = true;
		// return the async work
		return Promise.reject(new Error('Failed to get users'));
	},
	result => {
		// the async work succeeded
		users.names.push(result);
		users.isFetching = false;
	},
	(error: Error) => {
		// the async work failed
		users.fetchErrorMessage = error.message;
		users.isFetching = false;
	}
);

watchState(
	() => clickCounter.count === 5,
	countIsFive => {
		if (!countIsFive) return;
		setState('counter has the value 5, so I added another user', () => {
			users.names.push('Jenny');
		});
	}
);

for (let i = 0; i < 8; i++) {
	setState(`increment counter to ${i + 1}`, () => {
		clickCounter.count = i + 1;
	})
}
