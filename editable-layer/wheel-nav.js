(function () {
  "use strict";

  let locked = false;
  let acc = 0;
  let touchStartY = 0;
  let touchStartX = 0;
  let touchMoved = false;

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

  /* ===== Mouse wheel (desktop) ===== */
  window.addEventListener("wheel", (event) => {
    if (isEditingTarget(event.target)) return;
    event.preventDefault();
    acc += event.deltaY;
    if (locked || Math.abs(acc) < 70) return;

    locked = true;
    sendKey(acc > 0 ? "PageDown" : "PageUp");
    acc = 0;
    window.setTimeout(function () { locked = false; }, 520);
  }, { passive: false });

  /* ===== Touch swipe (mobile) ===== */
  document.addEventListener("touchstart", function (event) {
    if (isEditingTarget(event.target)) return;
    if (event.touches.length !== 1) return;
    touchStartY = event.touches[0].clientY;
    touchStartX = event.touches[0].clientX;
    touchMoved = false;
  }, { passive: true });

  document.addEventListener("touchmove", function (event) {
    if (isEditingTarget(event.target)) return;
    touchMoved = true;
  }, { passive: true });

  document.addEventListener("touchend", function (event) {
    if (isEditingTarget(event.target)) return;
    if (locked || !touchMoved) return;

    var touchEndY = event.changedTouches[0].clientY;
    var touchEndX = event.changedTouches[0].clientX;
    var dy = touchStartY - touchEndY;
    var dx = touchStartX - touchEndX;
    var threshold = 50;

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
      locked = true;
      sendKey(dy > 0 ? "PageDown" : "PageUp");
      window.setTimeout(function () { locked = false; }, 520);
    } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
      locked = true;
      sendKey(dx > 0 ? "ArrowRight" : "ArrowLeft");
      window.setTimeout(function () { locked = false; }, 520);
    }
  }, { passive: true });

  /* ===== Tap navigation buttons (mobile) ===== */
  (function addTapZones() {
    if (document.querySelector('.touch-nav-btn')) return; // already added

    var style = document.createElement('style');
    style.textContent =
      '.touch-nav-btn{position:fixed;z-index:9999;width:44px;height:44px;border-radius:50%;' +
      'background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;' +
      'color:#fff;font-size:20px;cursor:pointer;transition:opacity 0.3s;opacity:0.4;}' +
      '.touch-nav-btn:active{opacity:0.9;background:rgba(255,255,255,0.3);}' +
      '.touch-nav-prev{bottom:50%;left:8px;transform:translateY(50%);}' +
      '.touch-nav-next{bottom:50%;right:8px;transform:translateY(50%);}' +
      '.touch-nav-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;}' +
      '@media(min-width:768px){.touch-nav-btn{display:none}}'; /* hide on desktop */
    document.head.appendChild(style);

    var prev = document.createElement('button');
    prev.className = 'touch-nav-btn touch-nav-prev';
    prev.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
    prev.title = '上一页';
    prev.addEventListener('touchend', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (locked) return;
      locked = true;
      sendKey('PageUp');
      window.setTimeout(function () { locked = false; }, 520);
    });

    var next = document.createElement('button');
    next.className = 'touch-nav-btn touch-nav-next';
    next.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>';
    next.title = '下一页';
    next.addEventListener('touchend', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (locked) return;
      locked = true;
      sendKey('PageDown');
      window.setTimeout(function () { locked = false; }, 520);
    });

    document.body.appendChild(prev);
    document.body.appendChild(next);
  })();
})();
