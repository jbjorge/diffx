// This is the devtools script, which is called when the user opens the
// Chrome devtool on a page. We check to see if we global hook has detected
// Diffx presence on the page. If yes, create the Diffx panel; otherwise poll
// for 10 seconds.

let created = false
let checkCount = 0

chrome.devtools.network.onNavigated.addListener(createPanelIfHasDiffx)
const checkVueInterval = setInterval(createPanelIfHasDiffx, 1000)
createPanelIfHasDiffx()

function createPanelIfHasDiffx() {
	if (created || checkCount++ > 10) {
		clearInterval(checkVueInterval)
		return
	}
	chrome.devtools.inspectedWindow.eval(
		'!!(window.__DIFFX__)',
		function (hasVue) {
			if (!hasVue || created) {
				return
			}
			clearInterval(checkVueInterval)
			created = true
			chrome.devtools.panels.create(
				"diffx",
				"apple-touch-icon.png",
				"index.html",
				onPanelCreated
			)
		}
	)
}

function onPanelCreated(extensionPanel) {
	extensionPanel.onShown.addListener(function tmp(panelWindow) {
		const _window = panelWindow;
		extensionPanel.onShown.removeListener(tmp); // Run once only
		var outgoingPort = chrome.runtime.connect({ name: 'diffx_extension_out' });

		chrome.extension.onConnect.addListener(function (incomingPort) {
			if (incomingPort.name === 'diffx_extension_in') {
				incomingPort.onMessage.addListener(function (msg, { name }) {
					chrome.devtools.inspectedWindow.eval(`console.log("devtools:", "${msg}")`);
				})
			}
		})

		outgoingPort.postMessage(JSON.stringify('devtools_up'));
	});
}
