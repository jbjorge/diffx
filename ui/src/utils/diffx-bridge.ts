import { DiffListenerCallback } from '@diffx/rxjs/dist/internal-state';
import { DiffEntry } from '@diffx/rxjs/dist/internals';

let eventId = 0;

export function addDiffListener(cb: DiffListenerCallback, lazy?: boolean): number {
	const id = eventId++;
	window.addEventListener('message', (evt) => {
		try {
			const msg = evt.data;
			if (msg.id === id) {
				cb(msg.payload);
			}
		} catch {}
	})
	emitEvent('addDiffListener', id);
	return id;
}

export function removeDiffListener(listenerId: number): void {
	emitEvent('removeDiffListener', listenerId);
}

export function commit(): void {
	emitEvent('commit');
}

export function replaceState(state: any): void {
	emitEvent('replaceState', null, state)
}

export function lockState(): void {
	emitEvent('lockState');
}

export function unlockState(): void {
	emitEvent('unlockState');
}

export function pauseState(): void {
	emitEvent('pauseState');
}

export function unpauseState(): void {
	emitEvent('unpauseState');
}

export async function getStateSnapshot(): Promise<object> {
	const id = eventId++;
	const r = listenOnce('getStateSnapshot', id);
	emitEvent('getStateSnapshot', id);
	return r;
}

export async function getDiffs(): Promise<DiffEntry[]> {
	const id = eventId++;
	const r = await listenOnce('getDiffs', id);
	emitEvent('getDiffs', id);
	return r;
}

function emitEvent(funcName: string, msgId?: any, payload?: any) {
	window.postMessage({
		id: msgId,
		func: funcName,
		payload,
	}, window.location.origin);
}

function listenOnce(eventName: string, eventId: number): Promise<any> {
	return new Promise((resolve) => {
		window.addEventListener('message', function tmp(evt) {
			try {
				const msg = evt.data;
				if (msg.id === eventId) {
					window.removeEventListener('message', tmp);
					resolve(msg.payload);
				}
			} catch {}
		})
	})
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