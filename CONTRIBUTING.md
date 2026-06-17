# Contributing to Chrome MCP

Thanks for your interest in contributing! This document covers how the project is structured, how to set up a development environment, and how to submit changes.

---

## Project structure

```
chrome-mcp/
├── shared/          # Shared TypeScript types and protocol definitions
│   └── src/
│       └── protocol.ts   # BridgeAction enum + request/response types
│
├── extension/       # Chrome extension (Manifest V3)
│   ├── src/
│   │   ├── background.ts         # Service worker — WebSocket client + dispatch
│   │   ├── chromeApi.ts          # Promisified chrome.* wrappers + tab resolution
│   │   ├── handlers/
│   │   │   ├── index.ts          # Action → handler registry
│   │   │   ├── content.ts        # Page text / selection
│   │   │   ├── cookies.ts        # Cookies + localStorage
│   │   │   ├── interact.ts       # click, type, fillForm, scroll, clickAndWait
│   │   │   ├── navigate.ts       # navigateTo, goBack, goForward, reload, navigateAndWait
│   │   │   ├── network.ts        # Network request capture (chrome.debugger)
│   │   │   ├── console.ts        # Console log capture (chrome.debugger)
│   │   │   ├── screenshot.ts     # captureVisibleTab
│   │   │   ├── snapshot.ts       # Compound: screenshot + interactive elements + headings
│   │   │   └── tabs.ts           # Tab management
│   │   └── popup/                # Extension popup UI
│   └── manifest.json
│
├── server/          # npm package: mcp-real-chrome
│   ├── src/
│   │   ├── hub.ts                # Hub daemon (WebSocket + Unix socket IPC)
│   │   ├── hub-client.ts         # IPC client used by each MCP session
│   │   ├── bridge.ts             # Bridge interface
│   │   ├── index.ts              # MCP session entry point
│   │   ├── toolResult.ts         # MCP response helpers
│   │   └── tools/
│   │       ├── index.ts          # Registers all tools
│   │       ├── helpers.ts        # bridgeCall + shared tabSpecSchema
│   │       ├── content.ts
│   │       ├── cookies.ts
│   │       ├── interact.ts
│   │       ├── navigate.ts
│   │       ├── network.ts
│   │       ├── console.ts
│   │       ├── screenshot.ts
│   │       ├── snapshot.ts
│   │       └── tabs.ts
│   └── scripts/
│       └── bundle.mjs            # esbuild config (builds index.js + hub.js)
│
└── assets/          # Logo and icons
```

---

## Development setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- Chrome / Chromium

### Install

```bash
git clone https://github.com/DeepakSilaych/chrome-mcp.git
cd chrome-mcp
npm install
```

This is an npm workspaces monorepo. Running `npm install` at the root installs dependencies for all three packages (`shared`, `extension`, `server`).

### Build

```bash
# Build everything (server bundle + extension bundle)
npm run build

# Build only the server
npm run build:server

# Build only the extension
npm run build:extension
```

### Load the extension in Chrome

1. `chrome://extensions` → enable **Developer mode**.
2. Click **Load unpacked** → select the `extension/` folder (not `extension/dist/`).
3. The manifest points to `dist/background.js`, so you must build first.

### Run the hub locally

```bash
npm run hub
# or
node server/dist/hub.js
```

### Point Claude Code at your local build

```json
{
  "mcpServers": {
    "chrome-mcp": {
      "command": "node",
      "args": ["/path/to/chrome-mcp/server/dist/index.js"]
    }
  }
}
```

---

## Adding a new tool

Adding a tool involves three files: the shared protocol, the extension handler, and the server tool registration. Walk through each in order.

### 1. Add the bridge action

Open `shared/src/protocol.ts` and add your action name to the `BRIDGE_ACTIONS` array:

```typescript
export const BRIDGE_ACTIONS = [
  // ...existing actions...
  "myfeature.doSomething",
] as const;
```

Action names follow the `<namespace>.<verb>` convention.

### 2. Implement the extension handler

Create or extend a file in `extension/src/handlers/`. The handler receives the raw params object from the MCP session and must return a JSON-serialisable result.

```typescript
// extension/src/handlers/myfeature.ts
import { resolveTabSpec, type TabSpec } from "../chromeApi.js";

export async function doSomething(params: Record<string, unknown>): Promise<unknown> {
  const tabId = await resolveTabSpec(params as TabSpec); // honours tabId/tabUrl/tabTitle
  // ... your chrome.* API calls ...
  return { result: "done" };
}
```

Key helpers in `chromeApi.ts`:
- `resolveTabSpec(params)` — resolves a tab by `tabId`, `tabUrl` substring, `tabTitle` substring, or active tab.
- `executeScript(tabId, fn, args)` — injects and runs a function in the page context.
- `tabsGet(tabId)`, `tabsUpdate(tabId, props)`, etc.

Register the handler in `extension/src/handlers/index.ts`:

```typescript
import * as myfeature from "./myfeature.js";

const registry = {
  // ...
  "myfeature.doSomething": myfeature.doSomething,
};
```

### 3. Register the MCP tool

Create or extend a file in `server/src/tools/`. Use `tabSpecSchema` for any tool that operates on a tab so users get `tabUrl`/`tabTitle` support for free.

```typescript
// server/src/tools/myfeature.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall, tabSpecSchema } from "./helpers.js";

export function registerMyFeatureTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "do_something",
    {
      description: "One-sentence description of what this does and when to use it.",
      inputSchema: {
        myParam: z.string().describe("What this param does"),
        ...tabSpecSchema,
      },
    },
    async (args) =>
      bridgeCall(bridge, "myfeature.doSomething", {
        myParam: args.myParam,
        tabId: args.tabId,
        tabUrl: args.tabUrl,
        tabTitle: args.tabTitle,
      }),
  );
}
```

Register it in `server/src/tools/index.ts`:

```typescript
import { registerMyFeatureTools } from "./myfeature.js";

export function registerAllTools(mcp, bridge) {
  // ...existing registrations...
  registerMyFeatureTools(mcp, bridge);
}
```

### 4. Build and test

```bash
npm run build
```

Reload the extension in `chrome://extensions`, restart the hub, and reconnect Claude Code.

---

## Submitting a pull request

1. Fork the repo and create a branch: `git checkout -b feat/my-feature`.
2. Follow the conventions above — no new tool without `tabSpecSchema`, all handler params typed via casts from `Record<string, unknown>`.
3. Update `CHANGELOG.md` under an `## [Unreleased]` section.
4. Open a PR against `main` with a clear description of what changed and why.

---

## Release process (maintainers)

1. Move `## [Unreleased]` entries in `CHANGELOG.md` to a new `## [x.y.z] – YYYY-MM-DD` section.
2. Bump `server/package.json` version.
3. `npm run build:server`
4. `cd server && npm publish --access public`
5. Commit: `git commit -m "chore: release vx.y.z"` and tag: `git tag vx.y.z`.
6. `git push && git push --tags`
