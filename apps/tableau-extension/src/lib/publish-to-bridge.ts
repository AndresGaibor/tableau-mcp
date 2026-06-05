import type { TableauLiveContext } from "./collect-tableau-live-context";

export type PublishTableauContextToBridgeInput = {
  bridgeUrl: string;
  context: TableauLiveContext;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
};

export async function publishTableauContextToBridge(input: PublishTableauContextToBridgeInput): Promise<Response> {
  const fetchFn: (url: string, init?: RequestInit) => Promise<Response> = input.fetchImpl ?? ((url, init) => fetch(url, init));
  return await fetchFn(`${input.bridgeUrl}/tableau/context`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.context),
  });
}
