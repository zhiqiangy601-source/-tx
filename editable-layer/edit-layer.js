(function () {
  "use strict";

  const editableSelector = [
    ".slide h1",
    ".slide h2",
    ".slide h3",
    ".slide h4",
    ".slide p",
    ".slide li",
    ".slide td",
    ".slide th",
    ".slide .kicker",
    ".slide .lede",
    ".slide .label",
    ".slide .value",
    ".slide .delta",
    ".slide .owner",
    ".slide .tag",
    ".slide b",
    ".slide code",
    ".notes",
    "aside.notes"
  ].join(",");

  const selectableSelector = "a,img,video,iframe,[data-src],[data-href]";
  let editing = false;
  let selected = null;

  function createUi() {
    const toolbar = document.createElement("div");
    toolbar.className = "htmlppt-edit-toolbar";
    toolbar.dataset.editLayerUi = "true";
    toolbar.innerHTML = [
      '<button type="button" id="htmlpptEditToggle">编辑</button>',
      '<button type="button" id="htmlpptSave" data-primary="true">保存</button>',
      '<span class="htmlppt-edit-status" id="htmlpptStatus">Ready</span>'
    ].join("");
    document.body.appendChild(toolbar);

    const panel = document.createElement("div");
    panel.className = "htmlppt-edit-panel";
    panel.dataset.editLayerUi = "true";
    panel.innerHTML = [
      "<label>Link href / media src</label>",
      '<input id="htmlpptSelectedAttr" placeholder="粘贴 https:// 链接，或选择图片/视频后修改 URL" />',
      '<div class="htmlppt-edit-panel-actions">',
      '<button type="button" id="htmlpptApplyLink">创建/更新链接</button>',
      '<button type="button" id="htmlpptDeleteSelected" data-danger="true">删除元素</button>',
      "</div>"
    ].join("");
    document.body.appendChild(panel);

    document.querySelector("#htmlpptEditToggle").addEventListener("click", toggleEditing);
    document.querySelector("#htmlpptSave").addEventListener("click", saveHtml);
    document.querySelector("#htmlpptApplyLink").addEventListener("click", applyLink);
    document.querySelector("#htmlpptDeleteSelected").addEventListener("click", deleteSelected);
    window.setTimeout(linkifyAll, 0);
  }

  function setStatus(text) {
    const status = document.querySelector("#htmlpptStatus");
    if (status) status.textContent = text;
  }

  function toggleEditing() {
    editing = !editing;
    document.body.classList.toggle("htmlppt-editing", editing);
    document.querySelector("#htmlpptEditToggle").textContent = editing ? "退出编辑" : "编辑";
    markEditableElements();
    document.querySelectorAll("[data-htmlppt-editable='true']").forEach((element) => {
      element.setAttribute("contenteditable", editing ? "true" : "false");
      element.setAttribute("spellcheck", "false");
    });
    linkifyAll();
    setStatus(editing ? "Editing" : "Ready");
  }

  function isUi(element) {
    return Boolean(element.closest("[data-edit-layer-ui]"));
  }

  function hasOwnText(element) {
    return Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim());
  }

  function isEditableCandidate(element) {
    if (!element || isUi(element)) return false;
    if (!element.closest(".slide")) return false;
    if (element.matches(".slide,.deck,script,style,svg,canvas,img,video,iframe,a")) return false;
    if (element.closest("svg,canvas,a,[data-edit-layer-ui]")) return false;
    if (!hasOwnText(element)) return false;
    const childrenWithText = Array.from(element.children).filter((child) => hasOwnText(child) || child.querySelector("*"));
    if (childrenWithText.length > 2 && element.matches("div,section,article")) return false;
    return true;
  }

  function markEditableElements() {
    document.querySelectorAll("[data-htmlppt-editable='true']").forEach((element) => {
      if (!editing) {
        element.removeAttribute("contenteditable");
      }
    });
    document.querySelectorAll(".slide *").forEach((element) => {
      if (isEditableCandidate(element)) {
        element.dataset.htmlpptEditable = "true";
      }
    });
  }

  function selectElement(element) {
    if (!editing || !element || isUi(element)) return;
    if (selected) selected.classList.remove("htmlppt-selected");
    selected = element.closest(selectableSelector) || element.closest("[data-htmlppt-editable='true']");
    if (!selected) return;
    selected.classList.add("htmlppt-selected");
    const attr = document.querySelector("#htmlpptSelectedAttr");
    attr.value = selected.getAttribute("href") || selected.getAttribute("src") || selected.dataset.href || selected.dataset.src || "";
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function applyLink(showStatus = true) {
    if (!selected) return;
    const attr = document.querySelector("#htmlpptSelectedAttr").value.trim();
    if (!attr) {
      if (selected.tagName === "A") {
        selected.replaceWith(document.createTextNode(selected.textContent));
        setStatus("Link removed");
      }
      return;
    }

    if (selected.tagName === "A") {
      selected.setAttribute("href", attr);
    } else if (["IMG", "VIDEO", "IFRAME"].includes(selected.tagName)) {
      selected.setAttribute("src", attr);
    } else {
      const selection = window.getSelection();
      if (selection && selection.rangeCount && selected.contains(selection.anchorNode)) {
        const range = selection.getRangeAt(0);
        const label = range.toString().trim() || selected.textContent.trim() || attr;
        range.deleteContents();
        const link = document.createElement("a");
        link.className = "htmlppt-edit-link";
        link.href = attr;
        link.target = "_blank";
        link.rel = "noopener";
        link.setAttribute("contenteditable", "false");
        link.textContent = label;
        range.insertNode(link);
        selected.classList.remove("htmlppt-selected");
        selected = link;
        selected.classList.add("htmlppt-selected");
      } else {
        const label = selected.textContent.trim() || attr;
        selected.innerHTML = `<a class="htmlppt-edit-link" href="${escapeHtml(attr)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
        selected = selected.querySelector("a");
        selected.classList.add("htmlppt-selected");
      }
    }
    document.querySelector("#htmlpptSelectedAttr").value = attr;
    if (showStatus) setStatus("Link applied");
  }

  function normalizeUrl(url) {
    if (/^https?:\/\//i.test(url)) return url;
    if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(url)) return `https://${url}`;
    return url;
  }

  function looksLikeUrl(value) {
    return /^(https?:\/\/[^\s<]+|[\w.-]+\.[a-z]{2,}(\/[^\s<]*)?)$/i.test(value.trim());
  }

  function makeLink(url, label = url) {
    const link = document.createElement("a");
    link.className = "htmlppt-edit-link";
    link.href = normalizeUrl(url);
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("contenteditable", "false");
    link.textContent = label;
    return link;
  }

  function insertLinkAtSelection(url) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const editable = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer.closest?.("[data-htmlppt-editable='true']")
      : range.commonAncestorContainer.parentElement?.closest("[data-htmlppt-editable='true']");
    if (!editable) return false;
    range.deleteContents();
    const link = makeLink(url);
    range.insertNode(link);
    range.setStartAfter(link);
    range.setEndAfter(link);
    selection.removeAllRanges();
    selection.addRange(range);
    selected?.classList.remove("htmlppt-selected");
    selected = link;
    selected.classList.add("htmlppt-selected");
    document.querySelector("#htmlpptSelectedAttr").value = link.href;
    setStatus("Link created");
    return true;
  }

  function linkifyElement(element) {
    if (!element || ["A", "IMG", "VIDEO", "IFRAME"].includes(element.tagName)) return;
    if (element.querySelector("a")) return;
    const urlPattern = /(https?:\/\/[^\s<]+|[\w.-]+\.[a-z]{2,}\/[^\s<]+)/i;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const match = node.nodeValue.match(urlPattern);
      if (!match) continue;
      const before = node.nodeValue.slice(0, match.index);
      const after = node.nodeValue.slice(match.index + match[0].length);
      const link = makeLink(match[0]);
      const fragment = document.createDocumentFragment();
      if (before) fragment.append(before);
      fragment.append(link);
      if (after) fragment.append(after);
      node.replaceWith(fragment);
      selected = link;
      document.querySelector("#htmlpptSelectedAttr").value = link.href;
      setStatus("Link created");
      break;
    }
  }

  function linkifyAll() {
    markEditableElements();
    document.querySelectorAll("[data-htmlppt-editable='true']").forEach((element) => {
      if (!isUi(element)) linkifyElement(element);
    });
  }

  function deleteSelected() {
    if (!selected || selected.matches(".deck,.slide,body,html")) return;
    const next = selected.parentElement;
    selected.remove();
    selected = null;
    document.querySelector("#htmlpptSelectedAttr").value = "";
    if (next && next.childElementCount === 0 && next.matches("[data-htmlppt-editable='true']")) {
      next.textContent = "";
    }
    setStatus("Deleted");
  }

  function cleanClone() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("[data-edit-layer-ui], .progress-bar, .notes-overlay, .overview").forEach((node) => node.remove());
    clone.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
    clone.querySelectorAll("[data-htmlppt-editable]").forEach((node) => node.removeAttribute("data-htmlppt-editable"));
    clone.querySelectorAll(".htmlppt-selected").forEach((node) => node.classList.remove("htmlppt-selected"));
    clone.querySelectorAll(".is-active").forEach((node) => node.classList.remove("is-active"));
    clone.querySelector("body")?.classList.remove("htmlppt-editing");
    return "<!DOCTYPE html>\n" + clone.outerHTML + "\n";
  }

  function downloadHtml(html) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "index.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function saveHtml() {
    setStatus("Saving...");
    const html = cleanClone();
    try {
      const response = await fetch("/__htmlppt_edit__/save", {
        method: "PUT",
        headers: { "content-type": "text/html; charset=utf-8" },
        body: html
      });
      if (!response.ok) throw new Error(await response.text());
      setStatus(`Saved ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      downloadHtml(html);
      setStatus("Downloaded HTML");
    }
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (link && !isUi(link)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.open(link.href, "_blank", "noopener");
      return;
    }
    if (!editing) return;
    if (isUi(event.target)) return;
    selectElement(event.target);
  }, true);

  document.addEventListener("input", (event) => {
    if (!editing || isUi(event.target)) return;
    if (event.target.matches("[data-htmlppt-editable='true'], [data-htmlppt-editable='true'] *")) {
      const editable = event.target.closest("[data-htmlppt-editable='true']");
      window.setTimeout(() => linkifyElement(editable), 0);
    }
  }, true);

  document.addEventListener("paste", (event) => {
    if (!editing || isUi(event.target)) return;
    if (!event.target.closest("[data-htmlppt-editable='true']")) return;
    const pasted = event.clipboardData?.getData("text/plain")?.trim();
    if (pasted && looksLikeUrl(pasted)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      insertLinkAtSelection(pasted);
      return;
    }
    window.setTimeout(() => linkifyElement(event.target.closest("[data-htmlppt-editable='true']")), 0);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!editing) return;
    if (event.target.closest("[contenteditable='true'], input, textarea, select, [data-edit-layer-ui]")) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        event.stopImmediatePropagation();
        saveHtml();
      } else {
        event.stopImmediatePropagation();
      }
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveHtml();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createUi);
  } else {
    createUi();
  }
})();
