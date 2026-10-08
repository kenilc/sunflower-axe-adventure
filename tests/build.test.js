import { test } from "vitest";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "dist");
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const filename = path.join(directory, entry.name);
        return entry.isDirectory() ? files(filename) : [filename];
      }),
    )
  )
    .flat()
    .sort();
}
async function digest() {
  const hash = createHash("sha256");
  for (const filename of await files(output))
    hash.update(filename).update(await readFile(filename));
  return hash.digest("hex");
}
test("production build preserves binary models and works under a Pages subdirectory", async () => {
  const firstBuild = await digest();
  execFileSync(
    process.execPath,
    [path.join(root, "node_modules/vite/bin/vite.js"), "build"],
    { cwd: root },
  );
  assert.equal(
    await digest(),
    firstBuild,
    "Identical source must generate identical output",
  );
  const html = await readFile(path.join(output, "index.html"), "utf8");
  const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
    .map((match) => match[1])
    .filter((url) => !url.startsWith("data:"));
  assert(references.some((url) => url.endsWith(".js")));
  assert(references.some((url) => url.endsWith(".css")));
  for (const reference of references) {
    assert(
      reference.startsWith("./assets/"),
      `Deployable relative URL: ${reference}`,
    );
    await readFile(path.join(output, reference));
  }
  const emitted = await files(path.join(output, "assets"));
  for (const name of ["hero", "companion", "axe", "bench"]) {
    const model = emitted.find(
      (filename) =>
        path.basename(filename).startsWith(`${name}-`) &&
        filename.endsWith(".glb"),
    );
    assert(model, `${name} must be emitted with a content hash`);
    const original = await readFile(
      path.join(root, `src/assets/models/${name}.glb`),
    );
    const built = await readFile(model);
    assert.deepEqual(
      built,
      original,
      `${name} binary contents must survive the build unchanged`,
    );
    const buffer = new DataView(
      built.buffer,
      built.byteOffset,
      built.byteLength,
    );
    assert.equal(buffer.getUint32(0, true), 0x46546c67);
    assert.equal(buffer.getUint32(4, true), 2);
    assert.equal(buffer.getUint32(8, true), built.length);
  }
});
