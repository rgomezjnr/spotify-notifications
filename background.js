// The install method is to simply iterate through all tabs in all windows, and inject the content script programmatically into tabs with matching URLs.
// Runs on installed, reloaded and updated
// Fixes 'Extension context invalidated' error
chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.query({ url: "https://open.spotify.com/*" }, tabs => {
    if (tabs.length > 0) {
      for (const tab of tabs) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            files: ["content.js"],
          },
          () => {
            const lastErr = chrome.runtime.lastError;
            if (lastErr) {
              console.error("tab: " + tab.id + " lastError: " + JSON.stringify(lastErr));
            }
          }
        );
      }
    }
  });
});

let title;
// Listen for messages from the content script
chrome.runtime.onMessage.addListener(message => {
  // Check if the message is a song change event
  if (message.type === "songChange") {
    // Prevent multiple notifications if multiple tabs are open
    if (title !== message.title) {
      title = message.title;
      // Create a notification with the song title and artist
      chrome.notifications.create({
        type: "basic",
        title: message.title,
        message: message.artist,
        iconUrl: "icon.png",
      });
    }
  }
});

// Listen for clicks on the notifications
chrome.notifications.onClicked.addListener(() => {
  // Switch to the Spotify tab
  chrome.tabs.query({ url: "https://open.spotify.com/*" }, tabs => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    }
  });
});
