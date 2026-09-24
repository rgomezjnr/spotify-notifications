# Spotify Notifications

Shows a desktop notification when the song changes on [open.spotify.com](https://open.spotify.com). The notification uses the album cover as its icon, and falls back to the extension icon when no cover is available.

This is a local unpack of [Spotify Notifications](https://chromewebstore.google.com/detail/spotify-notifications/bafpmlbnkbemofddicmfkaigjnicdmcl) 1.0.0 by ViaxCo. Version 1.1.0 adds the cover art.

## Install

The Spotify tab has to stay open. The extension reads the player on the page. It does not talk to the Spotify desktop app.

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this folder.
4. Turn off the Chrome Web Store copy, **Spotify Notifications 1.0.0**, if it is still installed. Leaving both enabled posts two notifications for every track.
5. Reload the Spotify tab.

Clicking a notification switches to that tab.

## What changed in 1.1.0

The published extension always used `icon.png`. Chrome will not load a remote image as a notification icon, so the content script reads the cover from the now-playing bar, fetches a larger copy when Spotify's thumbnail is the usual 64px file, and scales it to a 128×128 PNG data URL. The background script uses that image as `iconUrl`.

Tracks with no artwork, ads, and local files that have no image keep the extension icon. If the cover image cannot be decoded, the notification is still shown with that icon.

The store `key` and `update_url` are removed so this copy can be loaded beside the published extension instead of taking its id.

## Limits

- The track already playing when the page loads does not get a notification. One is sent the next time the song changes.
- Several Spotify tabs are open: only one notification is posted per title.
- A Spotify redesign that removes the cover image from the now-playing bar stops the artwork until the selector in `content.js` is updated. Title and artist notifications still work.
- The icon is the small picture beside the title and artist, not a large banner.
