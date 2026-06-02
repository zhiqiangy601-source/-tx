(function () {
  "use strict";

  let locked = false;
  let acc = 0;

  function isEditingTarget(target) {
    return Boolean(target.closest("[contenteditable='true'], input, textarea, select, [data-edit-layer-ui]"));
  }

  function sendKey(key) {
    document.dispatchEvent(new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true
    }));
  }

  window.addEventListener("wheel", (event) => {
    if (isEditingTarget(event.target)) return;
    event.preventDefault();
    acc += event.deltaY;
    if (locked || Math.abs(acc) < 70) return;

    locked = true;
    sendKey(acc > 0 ? "PageDown" : "PageUp");
    acc = 0;
    window.setTimeout(() => {
      locked = false;
    }, 520);
  }, { passive: false });
})();
