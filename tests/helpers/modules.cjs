const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createModuleLoader(context) {
  const cache = new Map();
  function getModule(filename) {
    filename = path.resolve(filename);
    if (!cache.has(filename)) {
      cache.set(
        filename,
        new vm.SourceTextModule(fs.readFileSync(filename, "utf8"), {
          context,
          identifier: filename,
        }),
      );
    }
    return cache.get(filename);
  }
  return async function loadModule(filename) {
    const module = getModule(filename);
    if (module.status === "unlinked") {
      await module.link((specifier, importer) =>
        getModule(
          path.resolve(
            path.dirname(importer.identifier),
            specifier.split("?")[0],
          ),
        ),
      );
    }
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  };
}
module.exports = { createModuleLoader };
