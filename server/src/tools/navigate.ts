import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall } from "./helpers.js";

export function registerNavigateTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "navigate_to",
    {
      description: "Navigate a tab to a URL",
      inputSchema: {
        url: z.string(),
        tabId: z.number().int().positive().optional(),
      },
    },
    async (args) => bridgeCall(bridge, "navigate.to", { url: args.url, tabId: args.tabId }),
  );
  mcp.registerTool(
    "go_back",
    {
      description: "History back for a tab",
      inputSchema: { tabId: z.number().int().positive().optional() },
    },
    async (args) => bridgeCall(bridge, "navigate.back", { tabId: args.tabId }),
  );
  mcp.registerTool(
    "go_forward",
    {
      description: "History forward for a tab",
      inputSchema: { tabId: z.number().int().positive().optional() },
    },
    async (args) => bridgeCall(bridge, "navigate.forward", { tabId: args.tabId }),
  );
  mcp.registerTool(
    "reload_tab",
    {
      description: "Reload a tab",
      inputSchema: { tabId: z.number().int().positive().optional() },
    },
    async (args) => bridgeCall(bridge, "navigate.reload", { tabId: args.tabId }),
  );
}
