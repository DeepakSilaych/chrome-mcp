import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall } from "./helpers.js";

const formatSchema = z.enum(["text", "html", "markdown"]);

export function registerContentTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "get_page_content",
    {
      description: "Read page content from a tab as text, html, or markdown-oriented plain text",
      inputSchema: {
        tabId: z.number().int().positive().optional(),
        format: formatSchema.optional(),
      },
    },
    async (args) =>
      bridgeCall(bridge, "content.getPage", {
        tabId: args.tabId,
        format: args.format ?? "text",
      }),
  );
  mcp.registerTool(
    "get_selected_text",
    {
      description: "Get the current text selection in a tab",
      inputSchema: { tabId: z.number().int().positive().optional() },
    },
    async (args) => bridgeCall(bridge, "content.getSelection", { tabId: args.tabId }),
  );
}
