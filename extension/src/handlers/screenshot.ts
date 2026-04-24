import { resolveTabId, tabsGet } from "../chromeApi.js";

export async function capture(params: Record<string, unknown>): Promise<unknown> {
  const tab = await tabsGet(await resolveTabId());
  const windowId = (params.windowId as number | undefined) ?? tab.windowId;
  if (windowId == null) throw new Error("No window");
  return new Promise<string>((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!dataUrl) {
        reject(new Error("No screenshot data"));
      } else {
        resolve(dataUrl);
      }
    });
  });
}
