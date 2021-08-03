import { DiffListenerCallback } from '@diffx/core/dist/internal-state';
import { DiffEntry } from '@diffx/core/dist/internals';

let eventId = 1;

export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean): number {
	const id = eventId++;
	window.addEventListener('message', (evt) => {
		try {
			const msg = evt.data;
			if (msg.id === id) {
				cb(msg.payload);
			}
		} catch {
		}
	})
	emitEvent('addDiffListener', id);
	return id;
}

export function removeDiffListener(listenerId: number) {
	return runFunc('removeDiffListener', listenerId);
}

export function commit(count?: number) {
	if (count != null) {
		return runFunc('commit');
	}
	return runFunc('commit');
}

export function replaceState(state: any): Promise<any> {
	return runFunc('replaceState', state);
}

export function lockState() {
	return runFunc('lockState');
}

export function unlockState() {
	return runFunc('unlockState');
}

export function pauseState() {
	return runFunc('pauseState');
}

export function unpauseState() {
	return runFunc('unpauseState');
}

export async function getStateSnapshot(): Promise<object> {
	return runFunc('getStateSnapshot');
}

export async function getDiffs(): Promise<DiffEntry[]> {
	return runFunc('getDiffs');
}

function runFunc(name: string, payload?: any): Promise<any> {
	const id = eventId++;
	const response = new Promise(resolve => {
		window.addEventListener('message', function tmp(evt) {
			const msg = evt.data;
			if (msg.id === id && !msg.isFromDiffxBridge) {
				window.removeEventListener('message', tmp);
				resolve(msg.payload);
			}
		})
	});
	emitEvent(name, id, payload);
	return response;
}

function emitEvent(funcName: string, msgId?: any, payload?: any) {
	window.postMessage({
		id: msgId,
		func: funcName,
		payload: JSON.parse(JSON.stringify(payload || '')),
		isFromDiffxBridge: true
	}, window.location.origin);
}

export default {
	addDiffListener,
	removeDiffListener,
	commit,
	replaceState,
	lockState,
	unlockState,
	pauseState,
	unpauseState,
	getStateSnapshot,
	getDiffs
};