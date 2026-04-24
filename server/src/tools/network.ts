import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall } from "./helpers.js";

export function registerNetworkTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "start_network_capture",
    {
      description: "Attach debugger and start recording network requests for a tab",
      inputSchema: { tabId: z.number().int().positive() },
    },
    async ({ tabId }) => bridgeCall(bridge, "network.startCapture", { tabId }),
  );
  mcp.registerTool(
    "stop_network_capture",
    {
      description: "Stop network recording and detach debugger for that capture on the tab",
      inputSchema: { tabId: z.number().int().positive() },
    },
    async ({ tabId }) => bridgeCall(bridge, "network.stopCapture", { tabId }),
  );
  mcp.registerTool(
    "get_captured_requests",
    {
      description: "Return captured HTTP requests for a tab",
      inputSchema: {
        tabId: z.number().int().positive(),
        clearAfter: z.boolean().optional(),
      },
    },
    async (args) =>
      bridgeCall(bridge, "network.getCaptured", {
        tabId: args.tabId,
        clearAfter: args.clearAfter ?? false,
      }),
  );
}
