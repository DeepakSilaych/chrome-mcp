<p align="center">
  <img src="https://raw.githubusercontent.com/DeepakSilaych/chrome-mcp/main/assets/logo.png" width="140" alt="LiveMCP logo" />
</p>

<h1 align="center">livemcp</h1>

<p align="center">MCP server that gives AI direct access to your real browser — tabs, cookies, session state, and all.</p>

## Install

```bash
npx livemcp
```

Or add to your MCP client config:

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

## Requirements

Install the companion browser extension from the [main repo](https://github.com/DeepakSilaych/chrome-mcp). Click **Connect** in the extension popup after starting the server.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEMCP_PORT` | `17691` | WebSocket port (match in extension popup) |

## Architecture

```
MCP Client  ←—stdio—→  livemcp  ←—WebSocket—→  Browser Extension  ←—chrome.*—→  Browser
```

## Links

- [GitHub repo](https://github.com/DeepakSilaych/chrome-mcp) — full source, extension, docs
- [MIT License](https://github.com/DeepakSilaych/chrome-mcp/blob/main/LICENSE)
