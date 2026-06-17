import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHubClient } from "./hub-client.js";
import { registerAllTools } from "./tools/index.js";

const bridge = createHubClient();

const mcp = new McpServer(
  { name: "livemcp", version: "1.2.1" },
  {
    instructions:
      "Controls the user's real browser tabs via the LiveMCP bridge extension. Tools fail until the extension connects to the WebSocket on localhost. Prefer reading existing tabs over opening new ones.",
  },
);

registerAllTools(mcp, bridge);

const transport = new StdioServerTransport();
await mcp.connect(transport);
