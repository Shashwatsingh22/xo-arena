import { Client, Session, Socket } from "@heroiclabs/nakama-js";

const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || window.location.hostname;
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || "7350";
const NAKAMA_KEY = import.meta.env.VITE_NAKAMA_KEY || "defaultkey";
const NAKAMA_SSL = import.meta.env.VITE_NAKAMA_SSL === "true";

export const client = new Client(NAKAMA_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_SSL);

let _session: Session | null = null;
let _socket: Socket | null = null;

export function getSession(): Session | null {
  return _session;
}

export function getSocket(): Socket | null {
  return _socket;
}

export async function connectSocket(session: Session): Promise<Socket> {
  if (_socket) return _socket;
  const socket = client.createSocket(NAKAMA_SSL, false);
  await socket.connect(session, true);
  _socket = socket;
  return socket;
}

export async function disconnectSocket() {
  if (_socket) {
    _socket.disconnect(true);
    _socket = null;
  }
}

export async function authenticateDevice(username: string): Promise<Session> {
  let deviceId = localStorage.getItem("xo_device_id");
  if (!deviceId) {
    // crypto.randomUUID requires secure context (HTTPS), so fallback for HTTP
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = "xxxx-xxxx-xxxx-xxxx".replace(/x/g, () =>
        Math.floor(Math.random() * 16).toString(16)
      );
    }
    localStorage.setItem("xo_device_id", deviceId);
  }
  const session = await client.authenticateDevice(deviceId, true, username);
  _session = session;
  return session;
}
