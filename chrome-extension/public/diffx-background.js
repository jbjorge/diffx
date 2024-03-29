let msgBuffer = [];
let toWebsite;
let toExtension;

chrome.runtime.onConnect.addListener(function (port) {
	if (port.name === 'diffx_extension_out') {
		toExtension = chrome.extension.connect({ name: 'diffx_extension_in' });
		msgBuffer.forEach(msg => toExtension.postMessage(msg));
		msgBuffer = [];
	}

	if (port.name === 'diffx_from_website') {
		port.onMessage.addListener((message) => {
			if (!toExtension) {
				msgBuffer.push(message);
			} else {
				toExtension.postMessage(message);
			}
		});
	}
})
