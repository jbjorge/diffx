import { createState, diffxInternals, setDiffxOptions, setState, watchState } from '@diffx/core';

setDiffxOptions({
	devtools: true,
	includeStackTrace: true,
	maxNestingDepth: 100
});

// setup communication bridge
diffxInternals.addDiffListener((diff, commit) => {
	window.postMessage({ type: 'diffx_diff', diff: JSON.parse(JSON.stringify(diff)), commit }, window.location.origin);
});

window.addEventListener('message', evt => {
	if (evt.data.isSpammerResponse) {
		return;
	}
	if (evt.data.func) {
		// @ts-ignore
		let result = diffxInternals[evt.data.func](evt.data.payload);
		if (evt.data.id) {
			window.postMessage({
				id: evt.data.id,
				payload: result,
				isSpammerResponse: true
			}, window.location.origin);
		}
	}
});

const clickCounter = createState('click counter', { count: 0 });
const users = createState('users', { names: ['hihi'] as string[] });

setState('Change the counter and add a user', () => {
	clickCounter.count++;
	if (clickCounter.count > 2) {
		clickCounter.count = 200;
	}
	users.names.push('John');
})

export const usersStatus = createState('users-status', {
	isFetching: false,
	names: [] as string[],
	fetchErrorMessage: ''
});

setState(
	'fetch and update usersStatus',
	() => {
		// set state before the async work begins
		usersStatus.fetchErrorMessage = '';
		usersStatus.names = [];
		usersStatus.isFetching = true;
		// return the async work
		return Promise.resolve(['John', 'Jenny']);
	},
	result => {
		// the async work succeeded
		usersStatus.names = result;
		usersStatus.isFetching = false;
	},
	(error: Error) => {
		// the async work failed
		usersStatus.fetchErrorMessage = error.message;
		usersStatus.isFetching = false;
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
for (let i = 0; i < 4; i++) {
	setState(`Increment the counter to ${clickCounter.count + 1}`, () => clickCounter.count++);
}
