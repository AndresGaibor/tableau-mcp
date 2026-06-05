import type { BridgeState, TableauLiveEvent, TableauLiveContext } from "./bridge-state";

export type BridgeRequest = {
  method: string;
  path: string;
  body: string;
  bridge: BridgeState;
};

export type BridgeResponse = {
  status: number;
  json: unknown;
};

function parseJsonBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

export async function handleBridgeRequest(request: BridgeRequest): Promise<BridgeResponse> {
  if (request.method === "GET" && request.path === "/healthz") {
    return {
      status: 200,
      json: { ok: true, service: "tableau-desktop-mcp" },
    };
  }

  if (request.method === "POST" && request.path === "/tableau/context") {
    const context = parseJsonBody<TableauLiveContext>(request.body);
    request.bridge.setLiveContext(context);
    return {
      status: 202,
      json: { ok: true },
    };
  }

  if (request.method === "POST" && request.path === "/tableau/event") {
    const event = parseJsonBody<TableauLiveEvent>(request.body);
    request.bridge.recordEvent(event);
    return {
      status: 202,
      json: { ok: true },
    };
  }

  if (request.method === "POST" && request.path === "/tableau/action-result") {
    return {
      status: 202,
      json: { ok: true },
    };
  }

  return {
    status: 404,
    json: { ok: false, error: "not_found" },
  };
}
