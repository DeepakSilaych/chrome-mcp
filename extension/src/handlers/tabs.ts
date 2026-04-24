import { tabSummary, tabsCreate, tabsQuery, tabsRemove, tabsUpdate } from "../chromeApi.js";

export async function listTabs(): Promise<unknown> {
  const tabs = await tabsQuery({});
  return tabs.map((t) => tabSummary(t));
}

export async function getActiveTab(): Promise<unknown> {
  const tabs = await tabsQuery({ active: true, currentWindow: true });
  const t = tabs[0];
  if (!t) throw new Error("No active tab");
  return tabSummary(t);
}

export async function switchTab(params: Record<string, unknown>): Promise<unknown> {
  const tabId = params.tabId as number;
  await tabsUpdate(tabId, { active: true });
  return { tabId };
}

export async function closeTab(params: Record<string, unknown>): Promise<unknown> {
  const tabId = params.tabId as number;
  await tabsRemove(tabId);
  return { closed: tabId };
}

export async function createTab(params: Record<string, unknown>): Promise<unknown> {
  const url = params.url as string | undefined;
  const tab = await tabsCreate(url ? { url } : {});
  return tabSummary(tab);
}
