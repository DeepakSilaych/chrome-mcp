import { DEFAULT_WS_PORT } from "@chrome-mcp/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createBridge } from "./bridge.js";
import { registerAllTools } from "./tools/index.js";

const port = Number(process.env.CHROME_MCP_PORT ?? DEFAULT_WS_PORT) || DEFAULT_WS_PORT;
const bridge = createBridge(port);

const mcp = new McpServer(
  { name: "chrome-mcp", version: "1.0.0" },
  {
    instructions:
      "Controls the users real Chrome tabs via a bridge extension. Tools fail until the extension connects to the WebSocket on localhost. Prefer reading existing tabs over opening new ones.",
  },
);

registerAllTools(mcp, bridge);

const transport = new StdioServerTransport();
await mcp.connect(transport);
