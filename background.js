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

const FALLBACK_ICON = "icon.png";

let title;

function notificationOptions(songTitle, artist, iconUrl) {
  return {
    type: "basic",
    title: songTitle,
    message: artist,
    iconUrl,
  };
}

// chrome.notifications rejects remote image URLs. A bad data URL must not
// swallow the alert, so fall back to the packaged icon.
function showNotification(songTitle, artist, iconUrl) {
  chrome.notifications.create(notificationOptions(songTitle, artist, iconUrl), () => {
    const err = chrome.runtime.lastError;
    if (err && iconUrl !== FALLBACK_ICON) {
      chrome.notifications.create(notificationOptions(songTitle, artist, FALLBACK_ICON));
    }
  });
}

function iconUrlFor(message) {
  const cover = message.coverDataUrl;
  if (typeof cover === "string" && cover.startsWith("data:image/")) return cover;
  return FALLBACK_ICON;
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(message => {
  // Check if the message is a song change event
  if (message.type === "songChange") {
    // Prevent multiple notifications if multiple tabs are open
    if (title !== message.title) {
      title = message.title;
      showNotification(message.title, message.artist, iconUrlFor(message));
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
