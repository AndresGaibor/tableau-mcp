export type TableauLiveContext = {
  dashboardName: string;
  worksheets: Array<{ name: string }>;
  filters: Array<{ fieldName: string; values: string[] }>;
  parameters: Array<{ name: string; value: unknown }>;
};

export type TableauLiveEvent =
  | {
      type: "filter_changed";
      worksheetName: string;
      fieldName: string;
      values: string[];
    }
  | {
      type: "mark_selection_changed";
      worksheetName: string;
      selectedMarks: unknown[];
    }
  | {
      type: "parameter_changed";
      parameterName: string;
      value: unknown;
    };

export type TableauBridgeCommand = {
  type: "apply_filter";
  fieldName: string;
  values: string[];
  updateType: "REPLACE" | "ADD" | "REMOVE";
};

export type BridgeRecentEvent = TableauLiveEvent & {
  receivedAt: string;
};

export type BridgeState = {
  getLiveContext(): TableauLiveContext | null;
  setLiveContext(context: TableauLiveContext): void;
  recordEvent(event: TableauLiveEvent): void;
  getRecentEvents(): BridgeRecentEvent[];
  queueCommand(command: TableauBridgeCommand): void;
  getPendingCommands(): TableauBridgeCommand[];
  drainPendingCommands(): TableauBridgeCommand[];
};

export function createBridgeState(now: () => string = () => new Date().toISOString()): BridgeState {
  let liveContext: TableauLiveContext | null = null;
  const recentEvents: BridgeRecentEvent[] = [];
  const pendingCommands: TableauBridgeCommand[] = [];

  return {
    getLiveContext() {
      return liveContext;
    },
    setLiveContext(context) {
      liveContext = context;
    },
    recordEvent(event) {
      recentEvents.push({
        ...event,
        receivedAt: now(),
      });
    },
    getRecentEvents() {
      return [...recentEvents];
    },
    queueCommand(command) {
      pendingCommands.push(command);
    },
    getPendingCommands() {
      return [...pendingCommands];
    },
    drainPendingCommands() {
      const commands = [...pendingCommands];
      pendingCommands.length = 0;
      return commands;
    },
  };
}
