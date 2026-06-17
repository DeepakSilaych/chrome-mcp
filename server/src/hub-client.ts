import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import type { BridgeAction } from "@chrome-mcp/shared";
import type { Bridge } from "./bridge.js";

export const HUB_SOCK = process.env.CHROME_MCP_HUB_SOCK ?? "/tmp/chrome-mcp-hub.sock";

type Pending = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function createHubClient(requestTimeoutMs = 30_000): Bridge {
  const sessionId = randomUUID();
  const pending = new Map<string, Pending>();
  let hubConnected = false;
  let extensionConnected = false;
  let buf = "";

  const sock = createConnection(HUB_SOCK);

  const send = (msg: object) => {
    sock.write(JSON.stringify(msg) + "\n");
  };

  sock.on("connect", () => {
    hubConnected = true;
    send({ type: "register", sessionId });
  });

  sock.on("data", (chunk) => {
    buf += chunk.toString();
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let msg: Record<string, unknown>;
      try { msg = JSON.parse(line) as Record<string, unknown>; } catch { continue; }

      if (msg.type === "status") {
        extensionConnected = Boolean(msg.connected);
      } else if (msg.type === "response") {
        const id = msg.id as string;
        const slot = pending.get(id);
        if (!slot) continue;
        clearTimeout(slot.timer);
        pending.delete(id);
        if (msg.error !== undefined) {
          slot.reject(new Error(msg.error as string));
        } else {
          slot.resolve(msg.result);
        }
      }
    }
  });

  sock.on("close", () => {
    hubConnected = false;
    extensionConnected = false;
    for (const [, slot] of pending) {
      clearTimeout(slot.timer);
      slot.reject(new Error("Hub disconnected"));
    }
    pending.clear();
  });

  sock.on("error", (err) => {
    process.stderr.write(`[chrome-mcp] Hub connection error: ${err.message}\n`);
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      process.stderr.write(`[chrome-mcp] Hub not running. Start it with: chrome-mcp-hub\n`);
    }
  });

  const isConnected = () => hubConnected && extensionConnected;

  const request = (action: BridgeAction, params: Record<string, unknown> = {}) => {
    if (!hubConnected) {
      return Promise.reject(new Error("chrome-mcp-hub is not running. Start it with: chrome-mcp-hub"));
    }
    if (!extensionConnected) {
      return Promise.reject(new Error("Chrome extension not connected to hub"));
    }
    const id = randomUUID();
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error("Bridge request timed out"));
      }, requestTimeoutMs);
      pending.set(id, { resolve, reject, timer });
      send({ type: "request", sessionId, id, action, params });
    });
  };

  const close = async () => {
    if (hubConnected) send({ type: "unregister", sessionId });
    for (const [, slot] of pending) {
      clearTimeout(slot.timer);
      slot.reject(new Error("Bridge closed"));
    }
    pending.clear();
    sock.destroy();
  };

  return { isConnected, request, close };
}
