let currentElement = null;

let screenReaderEnabled = false;

function onDomReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback);
  } else {
    callback(); // DOM is already loaded
  }
}

onDomReady(() => {
  chrome.storage.sync.get("screenReaderEnabled", (data) => {
    screenReaderEnabled = data.screenReaderEnabled ?? false;
    console.log("Screen Reader Enabled:", screenReaderEnabled);
  });

  document.querySelectorAll("p").forEach((p) => {
    p.setAttribute("tabindex", "0");
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.screenReaderEnabled) {
    screenReaderEnabled = changes.screenReaderEnabled.newValue;
    console.log("Screen Reader status updated:", screenReaderEnabled);
  }
});
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

function findSectionByName(sectionName) {
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  sectionName = sectionName.toLowerCase();

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const headingText = heading.innerText.toLowerCase();

    if (headingText.includes(sectionName)) {
      // ✅ Scroll directly to the actual heading
      heading.scrollIntoView({ behavior: "smooth", block: "start" });

      // ✅ Optionally highlight it for visual confirmation
      heading.style.outline = "3px solid #007bff";
      heading.style.transition = "outline 0.3s";
      setTimeout(() => {
        heading.style.outline = "";
      }, 2000);

      // ✅ Read everything from heading until the next heading
      const sectionElements = [heading];
      let sibling = heading.nextElementSibling;

      while (
        sibling &&
        !(
          sibling.tagName.match(/^H[1-6]$/) &&
          parseInt(sibling.tagName[1]) <= parseInt(heading.tagName[1])
        )
      ) {
        sectionElements.push(sibling);
        sibling = sibling.nextElementSibling;
      }

      const fullText = sectionElements
        .map((el) => el?.innerText?.trim() || "")
        .join("\n");

      const msg = new SpeechSynthesisUtterance(
        fullText || "This section is empty."
      );
      msg.rate = 1;
      msg.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);

      return heading;
    }
  }

  console.warn("❌ No heading matched for section:", sectionName);
  return null;
}

//new
function scrollToAndReadSection(sectionElement) {
  if (!sectionElement) return;

  sectionElement.scrollIntoView({ behavior: "smooth", block: "start" });

  // Add highlight for visibility
  sectionElement.style.outline = "3px solid #007bff";
  sectionElement.style.transition = "outline 0.3s";

  setTimeout(() => {
    const text = sectionElement.innerText.trim();
    const msg = new SpeechSynthesisUtterance(text || "This section is empty.");
    msg.rate = 1;
    msg.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }, 500);
}


document.addEventListener("keydown", (event) => {
  if (!screenReaderEnabled) return;

  if (event.key === "Control") {
    // If Ctrl is pressed, stop any ongoing speech
    window.speechSynthesis.cancel();
    return;
  }

  if (
    ["Tab", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(
      event.key
    )
  ) {
    setTimeout(async () => {
      const activeElement = document.activeElement;
      if (activeElement) { // Not the best fix, but works for now
        currentElement = activeElement;
        if (activeElement.tagName === "P") {
          readElementText(activeElement);
        } else if (activeElement.tagName === "A") {
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
  if (!screenReaderEnabled) return;
  const target = event.target;
  if (target && target !== currentElement) {
    currentElement = target;

    if (target.tagName === "P") {
      // Handle paragraph elements
      readElementText(target);
    } else if (target.innerText.trim() !== "") {
      readElementText(target);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getPageText") {
    const elements = document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, a, button, li, span, input, label"
    );

    const structuredText = Array.from(elements).map((el) => {
      const tag = el.tagName.toLowerCase();
      let label =
        {
          h1: "Heading 1",
          h2: "Heading 2",
          h3: "Heading 3",
          h4: "Heading 4",
          h5: "Heading 5",
          h6: "Heading 6",
          p: "Paragraph",
          a: "Link",
          button: "Button",
          li: "List Item",
          span: "Text",
          input: "Input Field",
          label: "Label",
        }[tag] || "Element";

      let text = el.innerText?.trim() || el.value || "";

      // For links, include the href
      if (tag === "a" && el.href) {
        text += ` (URL: ${el.href})`;
      }

      // For inputs, include placeholder if no value
      if (tag === "input" && !text && el.placeholder) {
        text = `Placeholder: ${el.placeholder}`;
      }

      return text ? `${label}: ${text}` : null;
    });

    const filteredText = structuredText.filter(Boolean).join("\n");

    sendResponse({ text: filteredText });
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
  //new
  if (request.type === "scrollToSection") {
    console.log("scrollToSection received:", request.name); // ✅ log it

    const section = findSectionByName(request.name);

    if (section) {
      console.log("Scrolling to matched section:", section); // ✅ see what matched
      scrollToAndReadSection(section);
      sendResponse({ status: "success" });
    } else {
      console.warn("No section found matching:", request.name);
      sendResponse({ status: "not_found" });
    }

    return true;
  }
});

