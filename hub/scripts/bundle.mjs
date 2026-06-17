import * as esbuild from "esbuild";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const external = Object.keys(pkg.dependencies ?? {});

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/index.js",
  external,
  banner: { js: "#!/usr/bin/env node" },
  sourcemap: true,
});

console.log("hub bundled → dist/index.js");
