type NetRecord = {
  requestId: string;
  url?: string;
  method?: string;
  status?: number;
  responseHeaders?: Record<string, string>;
  body?: string;
};

type LogRecord = { text: string; level?: string; source?: string };

type TabCapture = {
  networkOn: boolean;
  consoleOn: boolean;
  requests: Map<string, NetRecord>;
  logs: LogRecord[];
};

const tabState = new Map<number, TabCapture>();
const attachedTabs = new Set<number>();

function getState(tabId: number): TabCapture {
  let s = tabState.get(tabId);
  if (!s) {
    s = { networkOn: false, consoleOn: false, requests: new Map(), logs: [] };
    tabState.set(tabId, s);
  }
  return s;
}

function sendDebuggerCommand(tabId: number, method: string, commandParams?: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, commandParams ?? {}, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

async function attachTab(tabId: number): Promise<void> {
  if (attachedTabs.has(tabId)) return;
  await new Promise<void>((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
  attachedTabs.add(tabId);
  await sendDebuggerCommand(tabId, "Network.enable", {});
  await sendDebuggerCommand(tabId, "Log.enable", {});
  await sendDebuggerCommand(tabId, "Runtime.enable", {});
}

async function detachTab(tabId: number): Promise<void> {
  if (!attachedTabs.has(tabId)) return;
  await new Promise<void>((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
  attachedTabs.delete(tabId);
}

let listenerBound = false;

function bindListener(): void {
  if (listenerBound) return;
  listenerBound = true;
  chrome.debugger.onEvent.addListener((source, method, params) => {
    const tabId = source.tabId;
    if (tabId == null) return;
    const st = tabState.get(tabId);
    if (!st) return;
    if (st.networkOn && method === "Network.requestWillBeSent") {
      const p = params as { requestId: string; request?: { url: string; method: string } };
      const cur = st.requests.get(p.requestId) ?? { requestId: p.requestId };
      cur.url = p.request?.url;
      cur.method = p.request?.method;
      st.requests.set(p.requestId, cur);
    }
    if (st.networkOn && method === "Network.responseReceived") {
      const p = params as {
        requestId: string;
        response?: { status: number; headers?: Record<string, string> };
      };
      const cur = st.requests.get(p.requestId) ?? { requestId: p.requestId };
      cur.status = p.response?.status;
      cur.responseHeaders = p.response?.headers;
      st.requests.set(p.requestId, cur);
    }
    if (st.networkOn && method === "Network.loadingFinished") {
      const p = params as { requestId: string };
      void loadBody(tabId, p.requestId);
    }
    if (st.consoleOn && method === "Log.entryAdded") {
      const p = params as { entry?: { text?: string; level?: string; source?: string } };
      st.logs.push({
        text: p.entry?.text ?? "",
        level: p.entry?.level,
        source: p.entry?.source,
      });
    }
    if (st.consoleOn && method === "Runtime.consoleAPICalled") {
      const p = params as {
        type?: string;
        args?: { type?: string; value?: unknown; description?: string }[];
      };
      const text = (p.args ?? [])
        .map((a) => {
          if (a.value !== undefined) return String(a.value);
          if (a.description) return a.description;
          return "";
        })
        .filter(Boolean)
        .join(" ");
      st.logs.push({ text, level: p.type, source: "console.api" });
    }
  });
  chrome.debugger.onDetach.addListener((source) => {
    const tabId = source.tabId;
    if (tabId != null) {
      attachedTabs.delete(tabId);
      tabState.delete(tabId);
    }
  });
}

async function loadBody(tabId: number, requestId: string): Promise<void> {
  const st = tabState.get(tabId);
  if (!st) return;
  try {
    const raw = (await sendDebuggerCommand(tabId, "Network.getResponseBody", {
      requestId,
    })) as { body: string; base64Encoded: boolean };
    const cur = st.requests.get(requestId);
    if (cur) {
      cur.body = raw.base64Encoded ? `[base64:${raw.body.length}]` : raw.body;
    }
  } catch {
    const cur = st.requests.get(requestId);
    if (cur) cur.body = "[body unavailable]";
  }
}

export async function startNetwork(tabId: number): Promise<{ ok: true }> {
  bindListener();
  const st = getState(tabId);
  st.networkOn = true;
  st.requests.clear();
  await attachTab(tabId);
  return { ok: true };
}

export async function stopNetwork(tabId: number): Promise<{ ok: true }> {
  const st = tabState.get(tabId);
  if (st) {
    st.networkOn = false;
    if (!st.consoleOn) {
      await detachTab(tabId);
      tabState.delete(tabId);
    }
  }
  return { ok: true };
}

export function getNetwork(tabId: number, clearAfter: boolean): NetRecord[] {
  const st = tabState.get(tabId);
  if (!st) return [];
  const out = [...st.requests.values()];
  if (clearAfter) st.requests.clear();
  return out;
}

export async function startConsole(tabId: number): Promise<{ ok: true }> {
  bindListener();
  const st = getState(tabId);
  st.consoleOn = true;
  st.logs = [];
  await attachTab(tabId);
  return { ok: true };
}

export async function stopConsole(tabId: number): Promise<{ ok: true }> {
  const st = tabState.get(tabId);
  if (st) {
    st.consoleOn = false;
    if (!st.networkOn) {
      await detachTab(tabId);
      tabState.delete(tabId);
    }
  }
  return { ok: true };
}

export function getConsole(tabId: number, clearAfter: boolean): LogRecord[] {
  const st = tabState.get(tabId);
  if (!st) return [];
  const out = [...st.logs];
  if (clearAfter) st.logs = [];
  return out;
}
