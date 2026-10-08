const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const directory = process.argv.includes("--dist")
  ? path.join(root, "dist")
  : root;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
const port = Number(process.env.PORT || 4173);
http
  .createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const filename = path.resolve(directory, relative);
    const assetPath = path
      .relative(directory, filename)
      .split(path.sep)
      .join("/");
    // Check the resolved path so encoded parent segments cannot expose metadata.
    if (assetPath !== "index.html" && !/^(src|vendor)\//.test(assetPath)) {
      response.writeHead(404).end("Not found");
      return;
    }
    fs.readFile(filename, (error, contents) => {
      if (error) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type":
          types[path.extname(filename)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(contents);
    });
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Serving ${directory === root ? "source" : "dist"} at http://127.0.0.1:${port}`,
    ),
  );
