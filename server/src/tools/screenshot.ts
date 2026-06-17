import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bridge } from "../bridge.js";
import { bridgeCall, tabSpecSchema } from "./helpers.js";

export function registerScreenshotTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "take_screenshot",
    {
      description: "Capture the visible area of a tab as PNG base64 data URL",
      inputSchema: { ...tabSpecSchema },
    },
    async (args) => bridgeCall(bridge, "screenshot.capture", { tabId: args.tabId, tabUrl: args.tabUrl, tabTitle: args.tabTitle }),
  );
}
