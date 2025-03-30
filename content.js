let currentElement = null;

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