import type { Bridge } from "../bridge.js";
import type { BridgeAction } from "@chrome-mcp/shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { errText, okJson } from "../toolResult.js";

export const tabSpecSchema = {
  tabId: z.number().int().positive().optional().describe("Numeric tab ID (prefer tabUrl/tabTitle — numeric IDs change when tabs are opened)"),
  tabUrl: z.string().optional().describe("Target the first tab whose URL contains this substring (e.g. 'github.com')"),
  tabTitle: z.string().optional().describe("Target the first tab whose title contains this substring (e.g. 'Dashboard')"),
};

export async function bridgeCall(
  bridge: Bridge,
  action: BridgeAction,
  params: Record<string, unknown> = {},
): Promise<CallToolResult> {
  try {
    const r = await bridge.request(action, params);
    return okJson(r);
  } catch (e) {
    return errText(e instanceof Error ? e.message : String(e));
  }
}
