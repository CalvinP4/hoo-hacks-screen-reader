const toggleVoice = document.getElementById("toggleVoice");
const voiceRate = document.getElementById("voiceRate");
const voicePitch = document.getElementById("voicePitch");
const voiceVolume = document.getElementById("voiceVolume");
const testButton = document.getElementById("testButton");
const summaryButton = document.getElementById("summaryButton");

testButton.addEventListener("click", () => {
  const msg = new SpeechSynthesisUtterance("Testing voice settings.");
  msg.rate = parseFloat(voiceRate.value); // Ensure correct number format
  msg.pitch = parseFloat(voicePitch.value);
  msg.volume = parseFloat(voiceVolume.value); // Ensure volume is between 0 - 1

  console.log(
    "Testing Voice - Rate:",
    msg.rate,
    "Pitch:",
    msg.pitch,
    "Volume:",
    msg.volume
  );

  window.speechSynthesis.cancel(); // Stop any ongoing speech
  window.speechSynthesis.speak(msg);
});

summaryButton.addEventListener("click", async () => {
  // Ask content script for page content
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const pageText = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type: "getPageText" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(response.text);
      }
    });
  });

  // Send that text to background for summarization
  const summary = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "summarize", payload: pageText }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.summary);
      }
    });
  });

  // Read it aloud
  const msg = new SpeechSynthesisUtterance(summary);
  msg.rate = parseFloat(voiceRate.value);
  msg.pitch = parseFloat(voicePitch.value);
  msg.volume = parseFloat(voiceVolume.value);
  window.speechSynthesis.speak(msg);
});

toggleVoice.addEventListener("change", () => {
  chrome.runtime.sendMessage(
    { action: "toggleReader", enabled: toggleVoice.checked },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Message Error:", chrome.runtime.lastError);
      } else {
        console.log("Response from background:", response);
      }
    }
  );
});