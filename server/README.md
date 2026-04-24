<p align="center">
  <img src="https://raw.githubusercontent.com/DeepakSilaych/chrome-mcp/main/assets/logo.png" width="140" alt="Chrome MCP logo" />
</p>

<h1 align="center">mcp-real-chrome</h1>

<p align="center">
  MCP server that gives AI access to your <strong>real Chrome tabs</strong> — no extra browser, no DevTools session.
</p>

---

An [MCP](https://modelcontextprotocol.io) server that bridges to a Chrome extension over WebSocket, exposing your **existing browser profile** — open tabs, cookies, session state — to any MCP client (Cursor, Claude Desktop, etc.).

## Usage

### Cursor / Claude Desktop

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

### Chrome Extension

The extension connects to the MCP server over WebSocket and executes `chrome.*` APIs on your behalf.

1. Clone the repo: `git clone https://github.com/DeepakSilaych/chrome-mcp.git`
2. Open `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder
4. Click the extension icon → **Connect**

## Available Tools

| Category | Tools |
|----------|-------|
| **Tabs** | `list_tabs` `get_active_tab` `switch_tab` `close_tab` `create_tab` |
| **Content** | `get_page_content` `get_selected_text` |
| **Screenshot** | `take_screenshot` |
| **Navigate** | `navigate_to` `go_back` `go_forward` `reload_tab` |
| **Network** | `start_network_capture` `stop_network_capture` `get_captured_requests` |
| **Console** | `start_console_capture` `stop_console_capture` `get_console_logs` |
| **Interact** | `click_element` `type_text` `fill_form` `scroll_page` |
| **Storage** | `get_cookies` `get_local_storage` |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CHROME_MCP_PORT` | `17691` | WebSocket port (match in extension popup) |

## How it Works

```
MCP Client  ←—stdio—→  mcp-real-chrome  ←—WebSocket—→  Chrome Extension  ←—chrome.*—→  Browser
```

The server speaks MCP over stdio and runs a WebSocket server on `127.0.0.1`. The Chrome extension connects to that WebSocket, receives requests, runs Chrome APIs against your real tabs, and returns results.

## Links

- [GitHub repo](https://github.com/DeepakSilaych/chrome-mcp) — full source, extension, docs
- [MIT License](https://github.com/DeepakSilaych/chrome-mcp/blob/main/LICENSE)
