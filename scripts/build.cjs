const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "dist");
function filesUnder(directory) {
  return fs
    .readdirSync(path.join(root, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const filename = path.posix.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(filename) : [filename];
    });
}
const files = [
  "index.html",
  ...filesUnder("src"),
  ...filesUnder("vendor"),
].sort();
const hash = crypto.createHash("sha256");
for (const filename of files) {
  hash.update(filename);
  hash.update("\0");
  hash.update(fs.readFileSync(path.join(root, filename)));
  hash.update("\0");
}
const version = hash.digest("hex").slice(0, 16);
const imports = /\bfrom\s+(["'])(\.[^"']+)\1/g;
// Validate the source graph before replacing deployment output.
for (const filename of files.filter(
  (file) => file.endsWith(".js") && !file.startsWith("vendor/"),
)) {
  const source = fs.readFileSync(path.join(root, filename), "utf8");
  for (const [, , specifier] of source.matchAll(imports)) {
    const dependency = path.posix.normalize(
      path.posix.join(path.posix.dirname(filename), specifier),
    );
    if (!files.includes(dependency))
      throw new Error(`${filename}: missing import ${specifier}`);
  }
}
fs.rmSync(output, { recursive: true, force: true });
for (const filename of files) {
  let source = fs.readFileSync(path.join(root, filename), "utf8");
  if (filename.endsWith(".js") && !filename.startsWith("vendor/")) {
    source = source.replace(
      imports,
      (_, quote, specifier) => `from ${quote}${specifier}?v=${version}${quote}`,
    );
  } else if (filename === "index.html") {
    source = source.replace(
      /(src|href)="(src\/[^"]+)"/g,
      (_, attribute, target) => `${attribute}="${target}?v=${version}"`,
    );
  }
  const target = path.join(output, filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, source);
}
console.log(`Built ${files.length} files in dist/ (version ${version})`);
