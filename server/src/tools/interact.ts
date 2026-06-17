import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Bridge } from "../bridge.js";
import { bridgeCall, tabSpecSchema } from "./helpers.js";

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
        ...tabSpecSchema,
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.click", { selector: args.selector, tabId: args.tabId, tabUrl: args.tabUrl, tabTitle: args.tabTitle }),
  );
  mcp.registerTool(
    "type_text",
    {
      description: "Type into an input element matched by selector",
      inputSchema: {
        selector: z.string(),
        text: z.string(),
        clear: z.boolean().optional(),
        ...tabSpecSchema,
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.type", {
        selector: args.selector,
        text: args.text,
        clear: args.clear ?? false,
        tabId: args.tabId,
        tabUrl: args.tabUrl,
        tabTitle: args.tabTitle,
      }),
  );
  mcp.registerTool(
    "fill_form",
    {
      description:
        "Fill multiple form fields by selector. Supports input, textarea, select (dropdown), checkbox (value=true/false), radio, and contentEditable. Set submit=true to submit the form after filling.",
      inputSchema: {
        fields: z.array(fieldSchema),
        submit: z.boolean().optional().describe("Submit the form after filling all fields"),
        ...tabSpecSchema,
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.fillForm", {
        fields: args.fields,
        submit: args.submit ?? false,
        tabId: args.tabId,
        tabUrl: args.tabUrl,
        tabTitle: args.tabTitle,
      }),
  );
  mcp.registerTool(
    "click_and_wait",
    {
      description:
        "Click an element and wait for a result. Use waitForNavigation=true when the click triggers a page navigation. Use waitFor=selector to wait for a specific element to appear (e.g. a modal or result). Saves an extra round-trip vs click_element + polling.",
      inputSchema: {
        selector: z.string(),
        waitForNavigation: z.boolean().optional().describe("Wait for page navigation to complete"),
        waitFor: z.string().optional().describe("CSS selector to wait for after clicking"),
        timeout: z.number().int().positive().optional().describe("Timeout in ms (default 5000)"),
        ...tabSpecSchema,
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.clickAndWait", {
        selector: args.selector,
        waitForNavigation: args.waitForNavigation ?? false,
        waitFor: args.waitFor,
        timeout: args.timeout,
        tabId: args.tabId,
        tabUrl: args.tabUrl,
        tabTitle: args.tabTitle,
      }),
  );
  mcp.registerTool(
    "scroll_page",
    {
      description: "Scroll the page by direction",
      inputSchema: {
        direction: z.enum(["up", "down", "left", "right"]),
        amount: z.number().int().positive().optional(),
        ...tabSpecSchema,
      },
    },
    async (args) =>
      bridgeCall(bridge, "interact.scroll", {
        direction: args.direction,
        amount: args.amount ?? 400,
        tabId: args.tabId,
        tabUrl: args.tabUrl,
        tabTitle: args.tabTitle,
      }),
  );
}
