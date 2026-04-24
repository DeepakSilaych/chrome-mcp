import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall } from "./helpers.js";

export function registerScreenshotTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "take_screenshot",
    {
      description: "Capture the visible area of the active tab as PNG base64 data URL",
      inputSchema: {
        windowId: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => bridgeCall(bridge, "screenshot.capture", { windowId: args.windowId }),
  );
}
