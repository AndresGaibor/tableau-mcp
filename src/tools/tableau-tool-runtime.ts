import type { TableauLiveContext } from "../bridge/bridge-state";

export type TableauFilterUpdateType = "REPLACE" | "ADD" | "REMOVE";

export type TableauApplyFilterRequest = {
  fieldName: string;
  values: string[];
  updateType: TableauFilterUpdateType;
};

export type TableauToolRuntimePort = {
  getLiveContext(): TableauLiveContext | null;
  applyFilter(request: TableauApplyFilterRequest): Promise<{ ok: true }>;
};

export function createTableauToolRuntime(port: TableauToolRuntimePort) {
  return {
    getLiveContext() {
      return Promise.resolve(port.getLiveContext());
    },
    applyFilter(request: TableauApplyFilterRequest) {
      return port.applyFilter(request);
    },
  };
}
