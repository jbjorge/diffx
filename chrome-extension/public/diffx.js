// This is the devtools script, which is called when the user opens the
// Chrome devtool on a page. We check to see if we global hook has detected
// Diffx presence on the page. If yes, create the Diffx panel; otherwise poll
// for 10 seconds.

let created = false
let checkCount = 0
let _panelWindow;

chrome.devtools.network.onNavigated.addListener(() => {
	if (_panelWindow) {
		_panelWindow.location.reload();
		setTimeout(() => {
			if (_panelWindow.document.readyState === 'loading') {
				_panelWindow.addEventListener('DOMContentLoaded', () => onPanelShown(_panelWindow, true), { once: true });
			} else {
				onPanelShown(_panelWindow, true);
			}
		}, 1000);
	} else {
		createPanelIfHasDiffx();
	}
})
let checkDiffxInterval = setInterval(createPanelIfHasDiffx, 1000)
createPanelIfHasDiffx();

function createPanelIfHasDiffx() {
	if (created || checkCount++ > 10) {
		clearInterval(checkDiffxInterval)
		return
	}
	chrome.devtools.inspectedWindow.eval(
		'!!(window.__DIFFX__)',
		function (hasDiffx) {
			if (!hasDiffx || created) {
				return
			}
			clearInterval(checkDiffxInterval)
			created = true
			chrome.devtools.panels.create(
				"diffx",
				"icon.png",
				"index.html",
				onPanelCreated
			)
		}
	)
}

function onPanelCreated(extensionPanel) {
	extensionPanel.onShown.addListener(function tmp(panelWindow) {
		extensionPanel.onShown.removeListener(tmp); // Run once only
		onPanelShown(panelWindow);
	});
}

function makeid(length) {
	let result = [];
	let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result.push(characters.charAt(Math.floor(Math.random() *
			charactersLength)));
	}
	return result.join('');
}

function onPanelShown(panelWindow, inspectedWindowReloaded) {
	_panelWindow = panelWindow;
	_panelWindow.windowId = makeid(16);

	chrome.devtools.inspectedWindow.eval(
		`
			window.__DIFFX__.addDiffListener((diff, commit) => {
				window.postMessage({type: 'diffx_diff', windowId: '${_panelWindow.windowId}', diff, commit}, window.location.origin);
			});
			`
	)

	_panelWindow.addEventListener('message', evt => {
		if (evt.data.func) {
			let evalString = '';
			if (evt.data.payload) {
				evalString = `(window.__DIFFX__["${evt.data.func}"](${JSON.stringify(evt.data.payload)}))`;
			} else {
				evalString = `(window.__DIFFX__["${evt.data.func}"]())`;
			}
			chrome.devtools.inspectedWindow.eval(
				evalString,
				function (result) {
					if (evt.data.id) {
						_panelWindow.postMessage({
							id: evt.data.id,
							payload: result
						});
					}
				}
			)
		}
	})

	if (!inspectedWindowReloaded) {
		var outgoingPort = chrome.runtime.connect({ name: 'diffx_extension_out' });
		chrome.runtime.onConnect.addListener(function (incomingPort) {
			if (incomingPort.name === 'diffx_extension_in') {
				incomingPort.onMessage.addListener(function (msg, { name }) {
					if (msg?.windowId && msg?.windowId !== _panelWindow.windowId) {
						return;
					}
					_panelWindow.postMessage(msg, _panelWindow.location.origin);
				})
			}
		});
	}
}
