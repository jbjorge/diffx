let toWebsite;
let toExtension;

console.log(chrome);

// messages from devtools to website
chrome.runtime.onConnect.addListener(function (port) {
	console.log('extensionport', arguments);
	if (port.name === 'diffx_extension_out') {
		port.onMessage.addListener((message) => {
			console.log('background:', message);
		})
		toExtension = chrome.extension.connect({ name: 'diffx_extension_in' });
		toExtension.postMessage('background_up');
	}
	if (port.name === 'diffx_website_out') {
		port.onMessage.addListener((message) => {
			console.log('background:', message);
		})
		chrome.tabs.query({ active: true }, tabs => {
			if (tabs.length > 0) {
				chrome.tabs.sendMessage(tabs[0].id, 'background_up', response => {
					console.log('response', response);
				});
			}
		})
	}
})
