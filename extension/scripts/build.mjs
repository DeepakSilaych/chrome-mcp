import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [join(root, "src/background.ts"), join(root, "src/popup.ts")],
  bundle: true,
  outdir: join(root, "dist"),
  format: "esm",
  platform: "browser",
  target: "chrome120",
  sourcemap: true,
});
