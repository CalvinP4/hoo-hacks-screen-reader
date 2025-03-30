const toggleVoice = document.getElementById("toggleVoice");
const voiceRate = document.getElementById("voiceRate");
const voicePitch = document.getElementById("voicePitch");
const voiceVolume = document.getElementById("voiceVolume");
const testButton = document.getElementById("testButton");
const summaryButton = document.getElementById("summaryButton");
const askQuestionButton = document.getElementById("askQuestionButton");

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
              Authorization: "Bearer <OPEN_AI_API_KEY>",
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