import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const deckFile = resolve(root, process.env.HTMLPPT_FILE || "index.html");
const port = Number(process.env.PORT || 4179);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
  });
  res.end(res.req?.method === "HEAD" ? undefined : body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function injectEditableLayer(html) {
  if (html.includes("/editable-layer/edit-layer.js")) return html;
  const css = '<link rel="stylesheet" href="/editable-layer/edit-layer.css">';
  const js = '<script src="/editable-layer/edit-layer.js?v=7"></script>';
  return html.replace("</head>", `${css}\n</head>`).replace("</body>", `${js}\n</body>`);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

    if (url.pathname === "/__htmlppt_edit__/save" && req.method === "PUT") {
      await writeFile(deckFile, await readBody(req), "utf8");
      send(res, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
      return;
    }

    if ((url.pathname === "/" || url.pathname === "/index.html") && (req.method === "GET" || req.method === "HEAD")) {
      const html = await readFile(deckFile, "utf8");
      send(res, 200, injectEditableLayer(html), "text/html; charset=utf-8");
      return;
    }

    const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const type = types[extname(filePath)] || "application/octet-stream";
    if (req.method === "HEAD") {
      send(res, 200, "", type);
      return;
    }
    createReadStream(filePath)
      .on("error", () => {
        if (!res.headersSent) send(res, 404, "Not found");
        else res.destroy();
      })
      .once("open", () => res.writeHead(200, {
        "content-type": type,
        "cache-control": "no-store, no-cache, must-revalidate, max-age=0"
      }))
      .pipe(res);
  } catch (error) {
    send(res, 500, error instanceof Error ? error.message : "Server error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Editable HTMLPPT running at http://127.0.0.1:${port}/`);
});
