"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Load .env before tests run (Node 22 built-in — no dotenv dependency needed)
// packages/db/.env is a symlink to the monorepo root .env.local
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const envPath = (0, node_path_1.resolve)(process.cwd(), ".env");
if ((0, node_fs_1.existsSync)(envPath)) {
  process.loadEnvFile(envPath);
}
//# sourceMappingURL=setup.js.map
