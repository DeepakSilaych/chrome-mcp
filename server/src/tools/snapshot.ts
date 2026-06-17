import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Bridge } from "../bridge.js";
import { tabSpecSchema } from "./helpers.js";
import { errText } from "../toolResult.js";

type SnapshotResult = {
  url: string;
  title: string;
  screenshot: string;
  interactive: unknown[];
  headings: string[];
};

export function registerSnapshotTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "get_page_snapshot",
    {
      description:
        "Get a full page snapshot in one call: visual screenshot + interactive elements (inputs, buttons, links with selectors) + headings + URL. Use this instead of separate screenshot + get_page_content calls to save round-trips.",
      inputSchema: { ...tabSpecSchema },
    },
    async (args) => {
      try {
        const result = (await bridge.request("page.snapshot", { tabId: args.tabId, tabUrl: args.tabUrl, tabTitle: args.tabTitle })) as SnapshotResult;
        const base64 = result.screenshot.replace(/^data:image\/[^;]+;base64,/, "");
        return {
          content: [
            { type: "image" as const, data: base64, mimeType: "image/png" as const },
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  url: result.url,
                  title: result.title,
                  headings: result.headings,
                  interactive: result.interactive,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (e) {
        return errText(e instanceof Error ? e.message : String(e));
      }
    },
  );
}
