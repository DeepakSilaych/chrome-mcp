import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall } from "./helpers.js";

const fieldSchema = z.object({
  selector: z.string(),
  value: z.string(),
});

export function registerInteractTools(mcp: McpServer, bridge: Bridge): void {
  mcp.registerTool(
    "click_element",
    {
      description: "Click the first element matching a CSS selector",
      inputSchema: {
        selector: z.string(),
        tabId: z.number().int().positive().optional(),
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.click", { selector: args.selector, tabId: args.tabId }),
  );
  mcp.registerTool(
    "type_text",
    {
      description: "Type into an input element matched by selector",
      inputSchema: {
        selector: z.string(),
        text: z.string(),
        clear: z.boolean().optional(),
        tabId: z.number().int().positive().optional(),
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.type", {
        selector: args.selector,
        text: args.text,
        clear: args.clear ?? false,
        tabId: args.tabId,
      }),
  );
  mcp.registerTool(
    "fill_form",
    {
      description: "Fill multiple inputs by selector",
      inputSchema: {
        fields: z.array(fieldSchema),
        tabId: z.number().int().positive().optional(),
      },
    },
    async (args) => bridgeCall(bridge, "interact.fillForm", { fields: args.fields, tabId: args.tabId }),
  );
  mcp.registerTool(
    "scroll_page",
    {
      description: "Scroll the page by direction",
      inputSchema: {
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z.number().int().positive().optional(),
        tabId: z.number().int().positive().optional(),
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.scroll", {
        direction: args.direction,
        amount: args.amount ?? 400,
        tabId: args.tabId,
      }),
  );
}
