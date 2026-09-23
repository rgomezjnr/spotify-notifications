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

// Store the current song
let currentSong;

// Create a MutationObserver to watch for changes in the song information
const observer = new MutationObserver(() => {
  // Get the new song
  const newSong = getCurrentSong();
  // Compare with the current song
  if (newSong.title !== currentSong.title || newSong.artist !== currentSong.artist) {
    // Send a message to the background script with the new song information
    chrome.runtime.sendMessage({
      type: "songChange",
      title: newSong.title,
      artist: newSong.artist,
    });

    // Update the current song
    currentSong = newSong;
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
