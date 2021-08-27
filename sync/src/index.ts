import { createState, diffxInternals } from '@diffx/core';
import { createSocket, ImprovedWebSocket } from './create-socket';
import { DtoBase, GetState } from './Dto';

const syncedNamespaces = new Set<string>();

interface SyncOptions {
	url: string;
}

export function createSyncedState<StateType extends object>(namespace: string, initialState: StateType, syncOptions?: SyncOptions) {
	startSync(namespace, syncOptions);
	return createState(namespace, initialState);
}

export function init(url: string) {
	const socket = createSocket(
		url,
		msg => {	}
	)

	diffxInternals.addDiffListener((diff, commit) => {

	}, true);
}

function startSync(namespace: string, syncOptions: SyncOptions) {

}