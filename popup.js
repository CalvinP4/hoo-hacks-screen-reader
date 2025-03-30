const toggleVoice = document.getElementById("toggleVoice");
const voiceRate = document.getElementById("voiceRate");
const voicePitch = document.getElementById("voicePitch");
const voiceVolume = document.getElementById("voiceVolume");
const testButton = document.getElementById("testButton");
const summaryButton = document.getElementById("summaryButton");
const describeImagesButton = document.getElementById("descImages");
const askQuestionButton = document.getElementById("askQuestionButton");


function speakButtonLabel(label) {
  const msg = new SpeechSynthesisUtterance(label);
  msg.rate = parseFloat(voiceRate.value);
  msg.pitch = parseFloat(voicePitch.value);
  msg.volume = parseFloat(voiceVolume.value);

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

const speakOnHoverOrFocus = (element, label) => {
  element.addEventListener("mouseenter", () => {
    speakButtonLabel(label);
  });

  element.addEventListener("focus", () => {
    speakButtonLabel(label);
  });
};

// Add voice labels for each control
speakOnHoverOrFocus(testButton, "Test voice button");
speakOnHoverOrFocus(summaryButton, "Read summary button");
speakOnHoverOrFocus(describeImagesButton, "Describe images button");
speakOnHoverOrFocus(askQuestionButton, "Ask a question button");
speakOnHoverOrFocus(toggleVoice, "Toggle screen reader checkbox");
speakOnHoverOrFocus(voiceRate, "Voice rate slider");
speakOnHoverOrFocus(voicePitch, "Voice pitch slider");
speakOnHoverOrFocus(voiceVolume, "Voice volume slider");


function speakSliderValue(label, value) {
  const msg = new SpeechSynthesisUtterance(`${label}: ${value}`);
  msg.rate = parseFloat(voiceRate.value);
  msg.pitch = parseFloat(voicePitch.value);
  msg.volume = parseFloat(voiceVolume.value);

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

voiceRate.addEventListener("input", () => {
  speakSliderValue("Voice rate", voiceRate.value);
});

voicePitch.addEventListener("input", () => {
  speakSliderValue("Voice pitch", voicePitch.value);
});

voiceVolume.addEventListener("input", () => {
  speakSliderValue("Voice volume", voiceVolume.value);
});



// TODO: Move this into a helper file
async function imageUrlToBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]); // Just the base64 part
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

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
    chrome.runtime.sendMessage(
      { type: "summarize", payload: pageText },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response.summary);
        }
      }
    );
  });

  // Read it aloud
  const msg = new SpeechSynthesisUtterance(summary);
  msg.rate = parseFloat(voiceRate.value);
  msg.pitch = parseFloat(voicePitch.value);
  msg.volume = parseFloat(voiceVolume.value);
  window.speechSynthesis.speak(msg);
});

// TODO: Remove this once the image description is implemented
describeImagesButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const imageSrcs = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type: "getImages" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError.message);
      } else {
        resolve(response.images);
      }
    });
  });

  if (!imageSrcs.length) return alert("No images found.");

  const base64Images = await Promise.all(
    imageSrcs.slice(0, 1).map(imageUrlToBase64) // just use the first image
  );

  const image = base64Images[0];

  const description = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "describeImage", imageBase64: image },
      (response) => {
        if (chrome.runtime.lastError)
          return reject(chrome.runtime.lastError.message);
        resolve(response.description);
      }
    );
  });

  const msg = new SpeechSynthesisUtterance(description);
  msg.rate = parseFloat(voiceRate.value);
  msg.pitch = parseFloat(voicePitch.value);
  msg.volume = parseFloat(voiceVolume.value);
  window.speechSynthesis.speak(msg);
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get("screenReaderEnabled", (data) => {
    toggleVoice.checked = data.screenReaderEnabled ?? false;
    console.log(toggleVoice.checked);
    enabled = toggleVoice.checked;
    updateUI(enabled);
  });
});

toggleVoice.addEventListener("change", () => {
  const enabled = toggleVoice.checked;

  chrome.runtime.sendMessage(
    { action: "toggleReader", enabled },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Message Error:", chrome.runtime.lastError);
      } else {
        console.log("Response from background:", response);
        updateUI(enabled);
      }
    }
  );

  if (!enabled) {
    window.speechSynthesis.cancel(); // Stop speaking when turned OFF
  }
});

function updateUI(enabled) {
  const buttons = [
    summaryButton,
    describeImagesButton,
    askQuestionButton,
    testButton,
  ];

  buttons.forEach((button) => {
    button.disabled = !enabled;
    button.style.opacity = enabled ? "1" : "0.5"; // Grays out buttons when disabled
    button.style.cursor = enabled ? "pointer" : "not-allowed";
  });

  // Update voice settings fields (if needed)
  voiceRate.disabled = !enabled;
  voicePitch.disabled = !enabled;
  voiceVolume.disabled = !enabled;
}

// ask a question logic
askQuestionButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // First: Get page content
  const pageText = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tab.id, { type: "getPageText" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(
          "Unable to access page text: " + chrome.runtime.lastError.message
        );
      } else {
        resolve(response.text);
      }
    });
  });

  // Now: Use speech recognition inside the tab
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (pageContent) => {
      const recognition = new (window.SpeechRecognition ||
        window.webkitSpeechRecognition)();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.start();

      recognition.onresult = async (event) => {
        const userQuestion = event.results[0][0].transcript;

        const prompt = `
You are a helpful assistant. Here is the content of the webpage:

"${pageContent.slice(0, 10000)}"

Now, based on this content, answer the user's question:
"${userQuestion}"
        `;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer <your-API-key>",
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
            }),
          }
        );

        console.log(response);

        const data = await response.json();
        const reply =
          data.choices?.[0]?.message?.content ||
          "Sorry, I couldn't get a response.";

        const msg = new SpeechSynthesisUtterance(reply);
        msg.rate = 1;
        msg.pitch = 1;
        msg.volume = 1;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(msg);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        alert("Speech recognition error: " + event.error);
      };
    },
    args: [pageText], // pass page content into the injected function
  });
});