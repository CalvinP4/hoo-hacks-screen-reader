const toggleVoice = document.getElementById("toggleVoice");
const voiceRate = document.getElementById("voiceRate");
const voicePitch = document.getElementById("voicePitch");
const voiceVolume = document.getElementById("voiceVolume");
const testButton = document.getElementById("testButton");

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