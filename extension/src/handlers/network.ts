import * as dbg from "../debuggerSession.js";

export async function startCapture(params: Record<string, unknown>): Promise<unknown> {
  const tabId = params.tabId as number;
  return dbg.startNetwork(tabId);
}

export async function stopCapture(params: Record<string, unknown>): Promise<unknown> {
  const tabId = params.tabId as number;
  return dbg.stopNetwork(tabId);
}

export async function getCaptured(params: Record<string, unknown>): Promise<unknown> {
  const tabId = params.tabId as number;
  const clearAfter = Boolean(params.clearAfter);
  return dbg.getNetwork(tabId, clearAfter);
}
