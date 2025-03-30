let currentElement = null;
console.log("Content script loaded");

function getElementType(element) {
  if (element instanceof HTMLButtonElement) {
    return "button";
  } else if (element instanceof HTMLAnchorElement) {
    return "link";
  } else if (element instanceof HTMLInputElement) {
    return "input field";
  } else if (element instanceof HTMLTextAreaElement) {
    return "text area";
  } else if (element instanceof HTMLSelectElement) {
    return "dropdown";
  } else if (
    element instanceof HTMLDivElement ||
    element instanceof HTMLSpanElement ||
    element instanceof HTMLElement
  ) {
    return "text";
  } else {
    return "unknown element";
  }
}
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

function readText(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1;
  msg.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(msg);
}

function readElementText(element) {
  if (element && element.innerText) {
    // Get the type of the element
    const elementType = getElementType(element);
    const textToRead = `${element.innerText} ${elementType}`; // Announce text and type

    // Create a new SpeechSynthesisUtterance with the combined text
    const msg = new SpeechSynthesisUtterance(textToRead);
    msg.rate = 1;
    msg.pitch = 1;

    // Cancel any ongoing speech to avoid interruptions and start reading
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

async function readImageText(imgElement) {
  const imgSrc = imgElement.src;

  console.log("Image source:", imgSrc);

  try {
    const base64Image = await imageUrlToBase64(imgSrc);

    const description = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: "describeImage", imageBase64: base64Image },
        (response) => {
          if (chrome.runtime.lastError)
            return reject(chrome.runtime.lastError.message);
          resolve(response.description);
        }
      );
    });

    console.log("Image description:", description);

    readText(description);
  } catch (error) {
    console.error("Error converting image to base64:", error);
  }
}

document.addEventListener("keydown", (event) => {
  if (
    ["Tab", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(
      event.key
    )
  ) {
    setTimeout(async () => {
      const activeElement = document.activeElement;
      if (activeElement && activeElement !== currentElement) {
        currentElement = activeElement;
        if (activeElement.tagName === "A") {
          const imgElement = activeElement.querySelector("img");

          if (imgElement) {
            readImageText(imgElement);
          }
        } else if (activeElement.tagName === "IMG") {
          readImageText(activeElement);
        } else if (activeElement.innerText.trim() !== "") {
          readElementText(activeElement);
        }
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
    const textNodes = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
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

  // TODO: Remove this once the image description is implemented
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