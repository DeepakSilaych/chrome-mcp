import type { BridgeAction } from "@livemcp/shared";
import * as consoleH from "./console.js";
import * as content from "./content.js";
import * as cookies from "./cookies.js";
import * as interact from "./interact.js";
import * as navigate from "./navigate.js";
import * as network from "./network.js";
import * as screenshot from "./screenshot.js";
import * as snapshot from "./snapshot.js";
import * as tabs from "./tabs.js";

const registry: Record<BridgeAction, (p: Record<string, unknown>) => Promise<unknown>> = {
  "tabs.list": () => tabs.listTabs(),
  "tabs.getActive": () => tabs.getActiveTab(),
  "tabs.switch": tabs.switchTab,
  "tabs.close": tabs.closeTab,
  "tabs.create": tabs.createTab,
  "content.getPage": content.getPage,
  "content.getSelection": content.getSelection,
  "screenshot.capture": screenshot.capture,
  "navigate.to": navigate.navigateTo,
  "navigate.back": navigate.goBack,
  "navigate.forward": navigate.goForward,
  "navigate.reload": navigate.reload,
  "navigate.andWait": navigate.navigateAndWait,
  "network.startCapture": network.startCapture,
  "network.stopCapture": network.stopCapture,
  "network.getCaptured": network.getCaptured,
  "console.startCapture": consoleH.startCapture,
  "console.stopCapture": consoleH.stopCapture,
  "console.getLogs": consoleH.getLogs,
  "interact.click": interact.click,
  "interact.type": interact.typeText,
  "interact.fillForm": interact.fillForm,
  "interact.clickAndWait": interact.clickAndWait,
  "interact.scroll": interact.scroll,
  "cookies.get": cookies.getCookies,
  "cookies.getLocalStorage": cookies.getLocalStorage,
  "page.snapshot": snapshot.getPageSnapshot,
};

export async function dispatch(action: BridgeAction, params: Record<string, unknown>): Promise<unknown> {
  const fn = registry[action];
  if (!fn) throw new Error(`Unknown action: ${action}`);
  return fn(params);
}
