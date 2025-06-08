chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "addContextNote",
        title: "Add note to selection",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "addContextNote") {
        chrome.tabs.sendMessage(tab.id, {
            action: "contextMenuNote",
            selection: info.selectionText
        });
    }
});