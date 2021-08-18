import { createState, diffxInternals } from '@diffx/core';
import { createSocket } from './create-socket';

const syncedNamespaces = new Set<string>();

export function createServerState<StateType extends object>(namespace: string, initialState: StateType) {
	syncedNamespaces.add(namespace);
	return createState(namespace, initialState);
}

export function init(url: string) {
	if (!url.startsWith('ws://')) {
		throw new Error('Malformed url. Needs to conform to ws://your.server.com');
	}
	const socket = createSocket(
		url,
		msg => {	},
		() => {
			socket.send({
				command: 'GET',

			})
		}
	)

	diffxInternals.addDiffListener((diff, commit) => {

	}, true);
}