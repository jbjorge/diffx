const outgoingPort = chrome.runtime.connect({ name: 'diffx_from_website' });
window.addEventListener('message', evt => {
	if (evt.data.type === 'diffx_diff') {
		outgoingPort.postMessage(evt.data);
	}
})