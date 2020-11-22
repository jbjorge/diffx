// Can use
// chrome.devtools.*
// chrome.extension.*

// Create a tab in the devtools area
chrome.devtools.panels.create("diffx", "logo.png", "index.html", function(panel) {});
