// Get the current song title and artist
function getCurrentSong() {
  const title = document.querySelector(
    '[data-testid="context-item-info-title"]'
  )?.textContent;
  const artist = document.querySelector(
    '[data-testid="context-item-info-artist"]'
  )?.textContent;
  return { title, artist };
}

// Cover shown in the player. Spotify's thumbnail is often 64px; the same
// image id with this size prefix is the 300px file, which stays sharp at 128.
function largerCoverUrl(url) {
  return url.replace(
    /^(https:\/\/i\.scdn\.co\/image\/)ab67616d0000[0-9a-f]{4}/i,
    "$1ab67616d00001e02"
  );
}

function getCoverArtUrl() {
  const widget = document.querySelector('[data-testid="now-playing-widget"]');
  const img =
    widget?.querySelector("img") ||
    document.querySelector('img[data-testid="cover-art-image"]');
  const url = img?.currentSrc || img?.src || "";
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return null;
  return url;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The title often updates a moment before the <img> src. Leave as soon as the
// cover URL changes. If it does not (same album, or the first change before a
// cover was known), wait out the deadline and use whatever is on screen.
async function waitForCoverUrl(previousUrl) {
  const deadline = Date.now() + 500;
  let url = getCoverArtUrl();
  while (Date.now() < deadline) {
    if (url && previousUrl && url !== previousUrl) return url;
    await sleep(50);
    url = getCoverArtUrl();
  }
  return url;
}

async function fetchCoverDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) return null;
  const bitmap = await createImageBitmap(blob);
  try {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } finally {
    bitmap.close();
  }
}

// chrome.notifications cannot load https icon URLs. Send a small data URL.
async function coverToDataUrl(url) {
  if (!url) return null;
  const larger = largerCoverUrl(url);
  const candidates = larger === url ? [url] : [larger, url];
  for (const candidate of candidates) {
    try {
      const dataUrl = await fetchCoverDataUrl(candidate);
      if (dataUrl) return dataUrl;
    } catch {
      // Try the original thumbnail, then give up and use the extension icon.
    }
  }
  return null;
}

// Store the current song
let currentSong;
let currentCoverUrl = null;
let notifyGeneration = 0;

function notifySongChange(song, previousCoverUrl) {
  const generation = ++notifyGeneration;
  waitForCoverUrl(previousCoverUrl).then(async coverUrl => {
    if (generation !== notifyGeneration) return;
    currentCoverUrl = coverUrl;
    const coverDataUrl = await coverToDataUrl(coverUrl);
    if (generation !== notifyGeneration) return;
    chrome.runtime.sendMessage(
      {
        type: "songChange",
        title: song.title,
        artist: song.artist,
        coverDataUrl,
      },
      () => {
        void chrome.runtime.lastError;
      }
    );
  });
}

// Create a MutationObserver to watch for changes in the song information
const observer = new MutationObserver(() => {
  // Get the new song
  const newSong = getCurrentSong();
  // Compare with the current song
  if (newSong.title !== currentSong.title || newSong.artist !== currentSong.artist) {
    const previousCoverUrl = currentCoverUrl;
    currentSong = newSong;
    notifySongChange(newSong, previousCoverUrl);
  }
});

const destroyContentJS = () => {
  function destructor() {
    // Destruction is needed only once
    document.removeEventListener(destructionEvent, destructor);
    // Tear down content script: Unbind events, clear timers, restore DOM, etc.
    // console.log("destroyed content.js and disconnected observer");
    observer.disconnect();
  }

  const destructionEvent = "destructmyextension_" + chrome.runtime.id;
  // Unload previous content script if needed
  document.dispatchEvent(new CustomEvent(destructionEvent));
  document.addEventListener(destructionEvent, destructor);
};

// Keep checking if title and artist have loaded on the page every 500ms before content script starts, so they will be defined
const intervalID = setInterval(() => {
  currentSong = getCurrentSong();

  if (currentSong.title && currentSong.artist) {
    currentCoverUrl = getCoverArtUrl();
    destroyContentJS();
    // Start content.js
    main();
  }
}, 500);

function main() {
  clearInterval(intervalID);

  // Configure the MutationObserver to watch for changes in the target element
  const nowPlaying = document.querySelector('[data-testid="now-playing-widget"]');

  // Start observing the target elements and run the mutation callback on change
  observer.observe(nowPlaying, {
    childList: true,
    subtree: true,
  });

  // Add an event listener to handle disconnection of observer before tab closes
  window.addEventListener("beforeunload", () => {
    // console.log("disconnected observer");
    destroyContentJS();
    observer.disconnect();
  });
}
