import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createHubClient } from "./hub-client.js";
import { registerAllTools } from "./tools/index.js";

const bridge = createHubClient();

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
