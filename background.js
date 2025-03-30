let screenReaderEnabled = false; // Store state globally

// Load state from Chrome storage when the extension starts
chrome.storage.sync.get("screenReaderEnabled", (data) => {
  screenReaderEnabled = data.screenReaderEnabled ?? false;
  console.log(`Screen Reader restored: ${screenReaderEnabled ? "ON" : "OFF"}`);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleReader") {
    screenReaderEnabled = message.enabled;

    // Save the new state in Chrome storage
    chrome.storage.sync.set({ screenReaderEnabled });

    console.log(`Screen Reader: ${screenReaderEnabled ? "ON" : "OFF"}`);

    sendResponse({ status: "success", enabled: screenReaderEnabled });
    return;
  }

  if (message.action === "getReaderState") {
    sendResponse({ enabled: screenReaderEnabled });
    return;
  }

  if (message.type === "describeImage" && screenReaderEnabled) {
    (async () => {
      try {
        const openaiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer <OPEN_AI_KEY>",
            },
            body: JSON.stringify({
              model: "gpt-4o", // or gpt-4-vision-preview
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Describe this image in 3 lines. This description is for a blind user.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:image/jpeg;base64,${message.imageBase64}`,
                      },
                    },
                  ],
                },
              ],
              max_tokens: 300,
            }),
          }
        );

        const data = await openaiResponse.json();

        const description =
          data.choices?.[0]?.message?.content || "No description returned.";

        sendResponse({ description });
      } catch (err) {
        console.error("Error describing image:", err);
        sendResponse({ description: "Failed to describe the image." });
      }
    })();

    return true; // Keep message port open for async
  }

  if (message.type === "summarize" && screenReaderEnabled) {
    // Async work starts here
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer <OPEN_AI_KEY>",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Summarize the following webpage content. Keep the summary to a maximum of 3 lines. Only highlight the main features of this page.",
          },
          {
            role: "user",
            content: message.payload.slice(0, 12000),
          },
        ],
        temperature: 0.7,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!screenReaderEnabled) return;
        const summary = data.choices?.[0]?.message?.content || "No summary.";
        console.log("Summarized text:", summary);
        sendResponse({ summary });
      })
      .catch((err) => {
        console.error("Summarization failed:", err);
        sendResponse({ summary: "An error occurred while summarizing." });
      });

    return true;
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "read-current" && currentElement) {
    readElementText(currentElement);
  }
});

