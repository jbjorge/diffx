const portname = 'diffx_extension';

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	console.log('website:', msg);
	sendResponse('haha');
})

const outgoingPort = chrome.runtime.connect({ name: 'diffx_website_out' });
outgoingPort.postMessage('website_up');

// console.log(chrome);

// chrome.runtime.onConnect.addListener(function(port) {
// 	if (port.name === 'diffx_website_in') {
// 		port.onMessage.addListener(function(msg, {name}) {
//
// 		})
// 	}
// })

// let port = chrome.runtime.connect({ name: portname });
// // port.postMessage('hello');
//
// port.onMessage.addListener((payload, { name }) => {
// 	console.log(payload);
// 	if (name !== portname) {
// 		return;
// 	}
// 	const msg = JSON.parse(payload);
// 	if (msg.func === 'addDiffListener') {
// 		const listenerId = __DIFFX__.addDiffListener(diff => {
// 			if (!port) {
// 				__DIFFX__.removeDiffListener(listenerId);
// 				return;
// 			}
// 			port.postMessage(JSON.stringify({
// 				func: 'addDiffListener',
// 				id: msg.id,
// 				payload: diff
// 			}))
// 		});
// 	} else if (__DIFFX__[msg.func]) {
// 		port.postMessage(JSON.stringify({
// 			func: msg.func,
// 			id: msg.id,
// 			payload: __DIFFX__[msg.func](...msg.args)
// 		}))
// 	} else {
// 		console.log('Unrecognized message', msg);
// 	}
// })
//
