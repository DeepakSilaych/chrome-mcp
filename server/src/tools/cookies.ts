import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall } from "./helpers.js";

export function registerCookieTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "get_cookies",
    {
      description: "List cookies for a URL",
      inputSchema: { url: z.string() },
    },
    async ({ url }) => bridgeCall(bridge, "cookies.get", { url }),
  );
  mcp.registerTool(
    "get_local_storage",
    {
      description: "Read localStorage for a tab origin",
      inputSchema: { tabId: z.number().int().positive().optional() },
    },
    async (args) => bridgeCall(bridge, "cookies.getLocalStorage", { tabId: args.tabId }),
  );
}
