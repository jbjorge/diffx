interface SocketsMap { [url: string]: WebSocket }
const socketsMap: SocketsMap = {};

interface ImprovedWebSocket extends WebSocket {
	send: (data: any) => void;
}

export function createSocket(url: string, onMessage: (msg: MessageEvent) => void, onConnected?: () => void): ImprovedWebSocket {
	const socket = socketsMap[url] || (socketsMap[url] = new WebSocket(url));

	// improve the close function
	const originalClose = socket.close;
	socket.close = (code?: number, reason?: string) => {
		socket.removeEventListener('message', onMessage);
		if (onConnected) {
			socket.removeEventListener('open', onConnected);
		}
		originalClose(code, reason);
	}

	// improve send function
	const originalSend = socket.send;
	socket.send = (data: any) => originalSend(negotiateSerialize(data))

	if (onConnected) {
		socket.addEventListener('open', onConnected);
	}
	socket.addEventListener('message', onMessage);
	return socket;
}

function negotiateSerialize(obj: any): string | ArrayBufferLike | Blob | ArrayBufferView {
	const isString = typeof obj === 'string';
	const isBlob = obj instanceof Blob;
	const isArrayBuffer = obj?.buffer instanceof ArrayBuffer && obj?.byteLength !== undefined;
	return (isString || isBlob || isArrayBuffer) ? obj : JSON.stringify(obj);
}