import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function okText(text: string): CallToolResult {
  return { content: [{ type: "text", text }] };
}

export function okJson(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function errText(message: string): CallToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}
