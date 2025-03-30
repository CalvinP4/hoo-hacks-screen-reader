let currentElement = null;
console.log("Content script loaded");


function readElementText(element) {
  if (element && element.innerText) {
    const msg = new SpeechSynthesisUtterance(element.innerText);
    msg.rate = 1;
    msg.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

document.addEventListener("keydown", (event) => {
  if (
    ["Tab", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(
      event.key
    )
  ) {
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (
        activeElement &&
        activeElement !== currentElement &&
        activeElement.innerText.trim() !== ""
      ) {
        currentElement = activeElement;
        readElementText(activeElement);
      }
    }, 100);
  }
});

document.addEventListener("focusin", (event) => {
  const target = event.target;
  if (target && target !== currentElement && target.innerText.trim() !== "") {
    currentElement = target;
    readElementText(target);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getPageText") {
    const textNodes = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textContent = [];

    while (textNodes.nextNode()) {
      const node = textNodes.currentNode;
      if (node.textContent.trim() !== "") {
        textContent.push(node.textContent);
      }
    }

    const fullText = textContent.join(" ");    
    sendResponse({ text: fullText });
    return true;
  }

  if (request.type === "getImages") {
    const imgElements = Array.from(document.querySelectorAll("img"));

    // Optionally filter by size or visibility
    const filteredImages = imgElements.filter((img) => {
      return img.width > 100 && img.height > 100 && img.src;
    });

    const imageSrcs = filteredImages.map((img) => img.src);
    sendResponse({ images: imageSrcs });
    return true;
  }
});

