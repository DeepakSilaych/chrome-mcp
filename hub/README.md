# livemcp-hub

Persistent WebSocket hub daemon for [LiveMCP](https://github.com/DeepakSilaych/chrome-mcp).

Run this once — the browser extension stays connected to the hub across MCP sessions.

## Usage

```bash
npx livemcp-hub
```

Then configure your MCP client to use `livemcp` (it will connect to the hub instead of managing its own WebSocket server).

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVEMCP_PORT` | `17691` | WebSocket port |
