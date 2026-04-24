import type { Bridge } from "../bridge.js";
import type { BridgeAction } from "@chrome-mcp/shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { errText, okJson } from "../toolResult.js";

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
