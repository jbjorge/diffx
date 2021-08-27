import { DtoBase } from './Dto';

interface SocketsMap { [url: string]: WebSocket }
const socketsMap: SocketsMap = {};

export interface ImprovedWebSocket extends WebSocket {
	send: (data: any) => void;
}

export function createSocket(url: string, onMessage: (msg: MessageEvent) => void): ImprovedWebSocket {
	const socket = socketsMap[url] || (socketsMap[url] = new WebSocket(url));

	const originalClose = socket.close;
	socket.close = (code?: number, reason?: string) => {
		socket.removeEventListener('message', onMessage);
		originalClose(code, reason);
	}

	// improve send function
	const originalSend = socket.send;
	socket.send = (data: any) => originalSend(negotiateSerialize(data));
	socket.addEventListener('message', onMessage);
	return socket;
}

function negotiateSerialize(obj: any): string | ArrayBufferLike | Blob | ArrayBufferView {
	const isString = typeof obj === 'string';
	const isBlob = obj instanceof Blob;
	const isArrayBuffer = obj?.buffer instanceof ArrayBuffer && obj?.byteLength !== undefined;
	return (isString || isBlob || isArrayBuffer) ? obj : JSON.stringify(obj);
}