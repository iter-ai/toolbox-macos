import fs from "fs";
import path from "node:path";
import url from "url";

const repoRoot = path.resolve(url.fileURLToPath(import.meta.url), "../../../");

const cliRoot = path.resolve(repoRoot, "cli");
const dataRoot = path.resolve(cliRoot, "data");

if (!fs.existsSync(dataRoot)) {
  fs.mkdirSync(dataRoot);
}

export namespace Path {
  // cloudflared tunnel
  export namespace cloudflared {
    export const root = path.resolve(dataRoot, "cloudflared");
    export const log = path.resolve(root, "log.json");
    export const bin = path.resolve(root, "bin");

    if (!fs.existsSync(root)) {
      fs.mkdirSync(root);
    }
  }
}
