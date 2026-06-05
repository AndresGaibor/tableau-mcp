import type { BridgeState } from "../bridge/bridge-state";
import type { TableauApplyFilterRequest } from "../tools/tableau-tool-runtime";

export function createTableauMcpRuntime(bridge: BridgeState) {
  return {
    getLiveContext() {
      return Promise.resolve(bridge.getLiveContext());
    },
    applyFilter(request: TableauApplyFilterRequest) {
      bridge.queueCommand({
        type: "apply_filter",
        fieldName: request.fieldName,
        values: request.values,
        updateType: request.updateType,
      });

      return Promise.resolve({ ok: true as const });
    },
  };
}
