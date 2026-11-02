import assert from "node:assert";
import http from "node:http";
import { resolvePackage, getAllPackageResolutions, generateTsConfigPaths, hostEco } from "../src/index.js";

async function runSubmoduleTests() {
  console.log("=== TESTING ECO RUST-STYLE SUBMODULE RESOLVER & HOST ===");

  const resolutions = getAllPackageResolutions();
  assert.ok(resolutions["@m3rcena/eco"]);
  assert.strictEqual(resolutions["@m3rcena/eco"].status, "submodule");
  console.log("  ✓ Eco detected as submodule");

  const tsPaths = generateTsConfigPaths();
  assert.ok(tsPaths["@m3rcena/eco"]);
  console.log("  ✓ Eco tsconfig paths generated");

  const { server, port } = await hostEco({ port: 5124, dbPath: ":memory:" });
  assert.strictEqual(port, 5124);

  const res = await new Promise<{ status: number; body: any }>((resolve, reject) => {
    http.get(`http://localhost:${port}/health`, (response) => {
      let data = "";
      response.on("data", (c) => (data += c));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: JSON.parse(data) }));
    }).on("error", reject);
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.package, "@m3rcena/eco");
  server.close();
  console.log("  ✓ Eco host server booted, served /health, and stopped cleanly");

  console.log("🎉 ALL ECO SUBMODULE RESOLVER TESTS PASSED!\n");
}

runSubmoduleTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
