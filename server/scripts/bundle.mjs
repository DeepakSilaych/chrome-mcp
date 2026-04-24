import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [join(root, "src/index.ts")],
  bundle: true,
  outfile: join(root, "dist/index.js"),
  format: "esm",
  platform: "node",
  target: "node18",
  sourcemap: true,
  banner: { js: "#!/usr/bin/env node" },
  external: [
    "@modelcontextprotocol/sdk",
    "@modelcontextprotocol/sdk/*",
    "zod",
    "ws",
  ],
});
