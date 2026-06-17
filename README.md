<p align="center">
  <img src="assets/logo.png" width="180" alt="Chrome MCP logo" />
</p>

<h1 align="center">Chrome MCP</h1>

<p align="center">
  MCP server that gives AI access to your <strong>real Chrome tabs</strong> — no extra browser, no DevTools session.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#mcp-tools">Tools</a> ·
  <a href="#how-it-works">How it Works</a> ·
  <a href="#remote--vm-setup">Remote / VM</a> ·
  <a href="LICENSE">MIT License</a>
</p>

---

An [MCP](https://modelcontextprotocol.io) server + Chrome extension that exposes your **existing browser profile** — open tabs, cookies, session state — to any MCP client (Claude Code, Cursor, etc.). Multiple Claude sessions share a single browser connection with no port conflicts.

## Quick Start

```bash
git clone https://github.com/DeepakSilaych/chrome-mcp.git
cd chrome-mcp
npm install
npm run build
```

### 1. Load the extension

**Option A — from release (recommended)**

1. Download `extension.zip` from the [latest release](https://github.com/DeepakSilaych/chrome-mcp/releases/latest).
2. Unzip it.
3. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the unzipped folder.

**Option B — from source**

1. `npm run build` (builds extension into `extension/dist/`).
2. `chrome://extensions` → **Load unpacked** → select the `extension/` folder.

### 2. Start the hub

The hub is a small always-on daemon that holds the WebSocket connection to the extension and multiplexes it across all your Claude sessions.

```bash
npm run hub
```

Keep this terminal open. You only ever need one hub per machine.

### 3. Configure your MCP client

**Claude Code / Cursor — from source**

```json
{
  "mcpServers": {
    "chrome-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/chrome-mcp/server/dist/index.js"]
    }
  }
}
```

**npx (no clone needed)**

```json
{
  "mcpServers": {
    "chrome-mcp": {
      "command": "npx",
      "args": ["-y", "mcp-real-chrome"]
    }
  }
}
```

### 4. Connect the extension

Click the extension icon in Chrome → **Connect**. The hub logs `Chrome extension connected`.

Open as many Claude chats as you want — each one gets its own session through the same hub.

---

## MCP Tools

| Category | Tools | Description |
|----------|-------|-------------|
| **Tabs** | `list_tabs` `get_active_tab` `switch_tab` `close_tab` `create_tab` | Manage open tabs |
| **Content** | `get_page_content` `get_selected_text` | Read page text / HTML / selection |
| **Screenshot** | `take_screenshot` | Capture visible tab as PNG |
| **Navigate** | `navigate_to` `go_back` `go_forward` `reload_tab` | Browser navigation |
| **Network** | `start_network_capture` `stop_network_capture` `get_captured_requests` | Record HTTP traffic |
| **Console** | `start_console_capture` `stop_console_capture` `get_console_logs` | Capture console output |
| **Interact** | `click_element` `type_text` `fill_form` `scroll_page` | Drive page elements |
| **Storage** | `get_cookies` `get_local_storage` | Read cookies and localStorage |

---

## How it Works

```
Chrome Extension (browser)
        │
        │  WebSocket ws://127.0.0.1:17691
        │
┌───────▼──────────────────┐
│   chrome-mcp-hub         │  ← start once with `npm run hub`
│   holds extension WS     │
│   Unix socket IPC        │
└───┬──────────┬───────────┘
    │          │  /tmp/chrome-mcp-hub.sock
    │          │
  MCP       MCP          ← one per Claude chat, spawned by Claude Code
session 1  session 2       each registers/unregisters automatically
(stdio)    (stdio)
```

**Three layers:**

1. **Chrome Extension** — runs in your browser, controls tabs via `chrome.*` APIs, connects up to the hub via WebSocket.
2. **Hub** (`chrome-mcp-hub`) — the only process that holds port 17691. Multiplexes the extension connection across all MCP sessions over a Unix socket. Start it once manually.
3. **MCP Sessions** (`chrome-mcp`) — one per Claude chat. Spawned by Claude Code via stdio, connect to the hub via Unix socket, clean up automatically when the chat ends.

**Why this architecture:**
- No port conflicts — only the hub ever binds 17691.
- Sessions are free — you can open 10 Claude chats simultaneously.
- Port never leaks — sessions exit cleanly via Unix socket, no zombie processes.

---

## Remote / VM Setup

Run Claude Code on a VM but Chrome on your laptop? Use one SSH tunnel:

```bash
# On your laptop — keep this open
ssh -L 17691:localhost:17691 your-vm
```

```bash
# On the VM — start the hub
npm run hub
```

The Chrome extension on your laptop connects through the tunnel to the hub on the VM. All VM Claude sessions share it.

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CHROME_MCP_PORT` | `17691` | WebSocket port for the hub. If busy, hub auto-increments and tells you the new port. |
| `CHROME_MCP_HUB_SOCK` | `/tmp/chrome-mcp-hub.sock` | Unix socket path for hub ↔ session IPC. |

### Port auto-fallback

If 17691 is taken, the hub tries 17692, 17693... and prints:

```
⚠️  Port 17691 was busy — hub bound to port 17692.
   Open the extension popup → change port to 17692 → reconnect.
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `chrome-mcp-hub is not running` | Run `npm run hub` first, then restart Claude. |
| "Chrome extension not connected to hub" | Click **Connect** in the extension popup. Check the port matches. |
| Script injection fails | Pages like `chrome://` and the Web Store block scripting. Use a normal `https://` tab. |
| Network/console capture errors | Only one debugger per tab. Close DevTools or stop other captures first. |
| Hub port busy on startup | Hub auto-increments — check the printed port and update the extension popup. |

---

## Security

The LLM can read and interact with any tab the extension can access. Avoid using this on profiles with sensitive sessions (banking, admin panels) unless you understand the risk. The hub and sessions only bind to `127.0.0.1` — not exposed to the network unless you explicitly tunnel.

---

## License

[MIT](LICENSE)
