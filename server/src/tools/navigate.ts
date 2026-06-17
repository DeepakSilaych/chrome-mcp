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
  mcp.registerTool(
    "navigate_and_wait",
    {
      description:
        "Navigate to a URL and wait for the page to fully load. Optionally wait for a specific CSS selector to appear after load. Faster than navigate_to + polling for content.",
      inputSchema: {
        url: z.string(),
        waitFor: z.string().optional().describe("CSS selector to wait for after page load"),
        timeout: z.number().int().positive().optional().describe("Timeout in ms (default 10000)"),
        tabId: z.number().int().positive().optional(),
      },
    },
    async (args) =>
      bridgeCall(bridge, "navigate.andWait", {
        url: args.url,
        waitFor: args.waitFor,
        timeout: args.timeout,
        tabId: args.tabId,
      }),
  );
}
