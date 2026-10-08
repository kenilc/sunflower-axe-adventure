const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const { createModuleLoader } = require("./helpers/modules.cjs");

(async () => {
  const root = path.resolve(__dirname, "..");
  function files(directory) {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : [filename];
      })
      .sort();
  }
  const output = path.join(root, "dist");
  function digest() {
    const hash = crypto.createHash("sha256");
    for (const filename of files(output))
      hash.update(filename).update(fs.readFileSync(filename));
    return hash.digest("hex");
  }
  const firstBuild = digest();
  execFileSync(process.execPath, [path.join(root, "scripts/build.cjs")]);
  assert.equal(
    digest(),
    firstBuild,
    "Identical source must generate identical output",
  );
  const html = fs.readFileSync(path.join(output, "index.html"), "utf8");
  const version = html.match(/src\/main\.js\?v=([a-f0-9]+)/)[1];
  assert(html.includes(`src/ui/styles.css?v=${version}`));
  for (const filename of files(path.join(output, "src")).filter((file) =>
    file.endsWith(".js"),
  )) {
    const source = fs.readFileSync(filename, "utf8");
    for (const [, specifier] of source.matchAll(
      /\bfrom\s+["'](\.[^"']+)["']/g,
    )) {
      const [target, query] = specifier.split("?");
      assert.equal(
        query,
        `v=${version}`,
        `${filename} must use the same cache version`,
      );
      assert(
        fs.existsSync(path.resolve(path.dirname(filename), target)),
        `Missing built module: ${specifier}`,
      );
    }
  }
  const loadModule = createModuleLoader(vm.createContext({}));
  const api = await loadModule(path.join(output, "src/game/create-game.js"));
  assert.equal(
    typeof api.createGame,
    "function",
    "The built module graph must link and export the game factory",
  );
  assert.equal(
    fs.existsSync(path.join(output, "game.js")),
    false,
    "Obsolete entry points must not survive a clean build",
  );
  console.log(
    "PASS: deterministic build, matching cache versions, all built imports, and production module graph",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
