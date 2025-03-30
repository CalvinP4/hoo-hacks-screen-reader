chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleReader") {
    console.log(`Screen Reader: ${message.enabled ? "ON" : "OFF"}`);
    sendResponse({ status: "success" }); // Ensure response to prevent error
  }
  return true; // Keep the message channel open for async response
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "read-current" && currentElement) {
    readElementText(currentElement);
  }
});
