<p align="center">
  <img src="assets/logo.png" width="180" alt="LiveMCP logo" />
</p>

<h1 align="center">LiveMCP</h1>

<p align="center">
  Give AI direct access to your real browser — open tabs, cookies, session state and all.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/livemcp"><img src="https://img.shields.io/npm/v/livemcp?label=npm" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-green" alt="MCP compatible" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#mcp-tools-reference">Tools</a> ·
  <a href="#tab-targeting">Tab Targeting</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#remote--vm-setup">Remote / VM</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

LiveMCP is an [MCP](https://modelcontextprotocol.io) server + browser extension that exposes your **existing browser profile** to any MCP client (Claude Code, Cursor, Zed, etc.).

Unlike Playwright-based automation tools, LiveMCP:

- Works on the browser **you are already using** — your logged-in sessions, cookies, and open tabs are all accessible.
- Does **not** launch a separate browser process.
- Supports **multiple simultaneous AI sessions** sharing one browser connection via a hub daemon.

---

## Quick Start

### 1. Install the Chrome extension

**From a release (recommended)**

1. Download `extension.zip` from the [latest release](https://github.com/DeepakSilaych/chrome-mcp/releases/latest).
2. Unzip it.
3. Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the unzipped folder.

**From source**

```bash
git clone https://github.com/DeepakSilaych/chrome-mcp.git
cd chrome-mcp
npm install && npm run build
# then Load unpacked → select the extension/ folder
```

### 2. Start the hub

The hub is a small always-on daemon. It holds the single WebSocket connection to the extension and multiplexes requests across all your AI sessions. Start it once and leave it running.

```bash
npx livemcp-hub
```

You should see:
```
[livemcp-hub] WebSocket  : ws://127.0.0.1:17691
[livemcp-hub] Ready — waiting for extension and sessions
```

### 3. Add to your MCP client

**Claude Code** (`~/.claude.json`):

```json
{
  "mcpServers": {
    "livemcp": {
      "command": "npx",
      "args": ["-y", "livemcp"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` or global settings):

```json
{
  "mcpServers": {
    "livemcp": {
      "command": "npx",
      "args": ["-y", "livemcp"]
    }
  }
}
```

### 4. Connect Chrome

Click the LiveMCP extension icon → **Connect**. The hub terminal prints `Chrome extension connected`.

Open as many AI chats as you want — each gets its own session through the same hub with no port conflicts.

---

## MCP Tools Reference

All tools that operate on a tab accept three optional tab-targeting params. See [Tab Targeting](#tab-targeting) for details.

### Snapshot

| Tool | Description |
|------|-------------|
| `get_page_snapshot` | **Compound tool** — returns a visual screenshot + interactive elements (inputs, buttons, links with CSS selectors) + page headings + URL/title in one call. Use this as your default way to observe a page. |

### Tabs

| Tool | Params | Description |
|------|--------|-------------|
| `list_tabs` | — | List all open tabs with id, title, URL, active status. |
| `get_active_tab` | — | Get the currently focused tab. |
| `switch_tab` | `tabId` | Focus a tab by numeric id. |
| `close_tab` | `tabId` | Close a tab. |
| `create_tab` | `url?` | Open a new tab, optionally navigating to a URL. |

### Content

| Tool | Params | Description |
|------|--------|-------------|
| `get_page_content` | `format?` | Read page content as `"text"` (default), `"html"`, or `"markdown"`. |
| `get_selected_text` | — | Return the current text selection in the tab. |

### Screenshot

| Tool | Params | Description |
|------|--------|-------------|
| `take_screenshot` | — | Capture the visible viewport as a PNG base64 data URL. |

### Navigation

| Tool | Params | Description |
|------|--------|-------------|
| `navigate_to` | `url` | Navigate the tab to a URL (fire and forget). |
| `navigate_and_wait` | `url`, `waitFor?`, `timeout?` | Navigate and block until `status=complete`. Optionally wait for a CSS selector to appear after load. |
| `go_back` | — | History back. |
| `go_forward` | — | History forward. |
| `reload_tab` | — | Reload the tab. |

### Interaction

| Tool | Params | Description |
|------|--------|-------------|
| `click_element` | `selector` | Click the first element matching a CSS selector. |
| `click_and_wait` | `selector`, `waitForNavigation?`, `waitFor?`, `timeout?` | Click and wait — either for a full page navigation (`waitForNavigation: true`) or for a CSS selector to appear (`waitFor: ".result"`). |
| `type_text` | `selector`, `text`, `clear?` | Type text into an input. Set `clear: true` to clear first. |
| `fill_form` | `fields`, `submit?` | Fill multiple fields in one call. Each field is `{ selector, value }`. Supports `<input>`, `<textarea>`, `<select>`, checkboxes (`"true"`/`"false"`), radio buttons, and `contentEditable`. Pass `submit: true` to submit the form after filling. |
| `scroll_page` | `direction`, `amount?` | Scroll `"up"`, `"down"`, `"left"`, or `"right"` by `amount` pixels (default 400). |

### Network capture

| Tool | Params | Description |
|------|--------|-------------|
| `start_network_capture` | — | Begin recording HTTP requests via Chrome DevTools Protocol. |
| `stop_network_capture` | — | Stop recording. |
| `get_captured_requests` | — | Return all requests captured since the last `start_network_capture`. |

> **Note:** Network and console capture use `chrome.debugger`. Only one debugger session per tab — close DevTools or stop other captures if you get a conflict error.

### Console capture

| Tool | Params | Description |
|------|--------|-------------|
| `start_console_capture` | — | Begin recording `console.*` output. |
| `stop_console_capture` | — | Stop recording. |
| `get_console_logs` | — | Return all captured log entries. |

### Storage

| Tool | Params | Description |
|------|--------|-------------|
| `get_cookies` | `url` | Return all cookies for a URL. |
| `get_local_storage` | — | Dump `localStorage` key/value pairs for the tab's origin. |

---

## Tab Targeting

Every tool that operates on a tab accepts three optional params for identifying which tab to use:

| Param | Type | Description |
|-------|------|-------------|
| `tabId` | `number` | Exact numeric Chrome tab ID. Fragile — IDs change when new tabs are opened. |
| `tabUrl` | `string` | Substring match against the tab's URL (case-insensitive). |
| `tabTitle` | `string` | Substring match against the tab's title (case-insensitive). |

**Resolution order:** `tabId` → `tabUrl` → `tabTitle` → currently active tab.

### Examples

```
# Always targets the GitHub tab, regardless of which tab is in focus
get_page_snapshot tabUrl="github.com"

# Target the Linear tab by title
navigate_and_wait url="..." tabTitle="Linear"

# Fill a login form on a specific tab
fill_form fields=[...] submit=true tabUrl="app.example.com/login"

# If nothing is specified, the active tab is used
take_screenshot
```

Using `tabUrl` or `tabTitle` means your instructions remain correct even as the user opens new tabs, switches windows, or Chrome reassigns numeric IDs.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Your Chrome Browser                            │
│  ┌─────────────────────────────────────────┐   │
│  │  LiveMCP Extension (Manifest V3)        │   │
│  │  • Receives requests from hub           │   │
│  │  • Executes chrome.* API calls          │   │
│  │  • Returns results back to hub          │   │
│  └──────────────┬──────────────────────────┘   │
└─────────────────│───────────────────────────────┘
                  │ WebSocket ws://127.0.0.1:17691
                  │
┌─────────────────▼───────────────────────────────┐
│  livemcp-hub  (start once, keep running)        │
│  • Holds the single WebSocket to the extension  │
│  • Exposes Unix socket /tmp/livemcp-hub.sock    │
│  • Routes requests from sessions to extension   │
│  • Routes responses back by session ID          │
└──────────┬──────────────────┬───────────────────┘
           │  Unix socket     │  Unix socket
           │                  │
┌──────────▼────┐   ┌─────────▼──────┐
│ MCP Session 1 │   │ MCP Session 2  │  ← spawned by Claude Code
│ (stdio/npx)   │   │ (stdio/npx)    │    one per chat window
└───────────────┘   └────────────────┘
```

**Three layers:**

1. **Chrome Extension** — runs inside Chrome, calls `chrome.*` APIs, connected to the hub via WebSocket.
2. **Hub** (`npx livemcp-hub`) — the only process that binds port 17691. Holds the browser connection and fans it out to sessions via a Unix domain socket. Start once per machine.
3. **MCP Sessions** (`npx livemcp`) — one per AI chat. Spawned and killed by the MCP client (Claude Code, Cursor, etc.). Connect to the hub via Unix socket; clean up automatically when the chat ends.

**Why this architecture:**
- No port conflicts — only the hub ever binds 17691.
- Unlimited simultaneous sessions — each session is just a Unix socket client.
- No zombie processes — sessions exit cleanly via socket disconnect detection.
- Browser state is shared — all sessions see the same tabs, cookies, and page state.

---

## Remote / VM Setup

Running Claude Code on a remote VM but Chrome on your laptop? Use one SSH tunnel:

```bash
# On your laptop — keep this terminal open
ssh -L 17691:localhost:17691 your-vm-hostname
```

```bash
# On the VM — start the hub
npx livemcp-hub
```

The Chrome extension on your laptop connects through the tunnel to the hub on the VM. All VM Claude sessions share the connection automatically.

---

## Configuration

| Environment variable | Default | Description |
|----------------------|---------|-------------|
| `LIVEMCP_PORT` | `17691` | WebSocket port for the hub. |
| `LIVEMCP_HUB_SOCK` | `/tmp/livemcp-hub.sock` | Unix socket path for hub ↔ session IPC. |

### Port auto-fallback

If port 17691 is already in use, the hub automatically tries 17692, 17693, … and prints:

```
⚠️  Port 17691 was busy — hub bound to port 17692.
   Open the extension popup → change port to 17692 → Reconnect.
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `livemcp-hub is not running` | Run `npx livemcp-hub` first, then restart the MCP client. |
| "Chrome extension not connected" | Click **Connect** in the extension popup. Check that the port matches what the hub printed. |
| Tool calls hang indefinitely | The hub is running but the extension disconnected. Re-click **Connect** in the popup. |
| Script injection fails on a tab | Pages like `chrome://`, the Chrome Web Store, and PDF viewer tabs block scripting. Use a normal `https://` page. |
| Network / console capture conflict | `chrome.debugger` allows only one session per tab. Close DevTools or call `stop_network_capture` / `stop_console_capture` before starting a new one. |
| Hub port busy on startup | The hub auto-increments — check the printed port and update the extension popup to match. |
| `waitForNavigation` times out | The click didn't cause a navigation. Use `waitFor: ".selector"` instead to wait for a DOM change. |

---

## Security

- The LLM can read and interact with any tab the extension can access. Avoid using this on Chrome profiles with highly sensitive sessions (banking, admin panels) unless you understand and accept the risk.
- The hub and sessions only bind to `127.0.0.1` — not exposed to the network unless you explicitly tunnel.
- The Unix socket at `/tmp/livemcp-hub.sock` is accessible to all processes running as your user.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, the step-by-step guide to adding a new tool, and the release process.

Issues and pull requests are welcome. Please open an issue before starting large changes so we can discuss the approach first.

---

## License

[MIT](LICENSE) © Deepak Silaych
