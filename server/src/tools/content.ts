import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall, tabSpecSchema } from "./helpers.js";

const formatSchema = z.enum(["text", "html", "markdown", "aria"]);

export function registerContentTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "get_page_content",
    {
      description:
        'Read content from a tab. Formats: "aria" (recommended) — compact accessibility tree with roles, names, and CSS selectors (~10-20x smaller than HTML, ideal for understanding page structure and finding selectors); "text" — visible plain text; "html" — raw HTML; "markdown" — plain text alias. Use selector to scope to a specific element (e.g. "#main", ".results") instead of the whole page.',
      inputSchema: {
        ...tabSpecSchema,
        format: formatSchema.optional().describe('"aria" | "text" | "html" | "markdown" — default: "aria"'),
        selector: z.string().optional().describe("CSS selector to scope extraction to a subtree (e.g. '#main', '.search-results', 'table')"),
      },
    },
    async (args) =>
      bridgeCall(bridge, "content.getPage", {
        tabId: args.tabId, tabUrl: args.tabUrl, tabTitle: args.tabTitle,
        format: args.format ?? "aria",
        selector: args.selector,
      }),
  );
  mcp.registerTool(
    "get_selected_text",
    {
      description: "Get the current text selection in a tab",
      inputSchema: { ...tabSpecSchema },
    },
    async (args) => bridgeCall(bridge, "content.getSelection", { tabId: args.tabId, tabUrl: args.tabUrl, tabTitle: args.tabTitle }),
  );
}
