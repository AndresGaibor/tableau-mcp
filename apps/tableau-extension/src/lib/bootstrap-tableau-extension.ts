import { collectTableauLiveContext } from "./collect-tableau-live-context";
import { publishTableauContextToBridge } from "./publish-to-bridge";

export const TableauEventType = {
  FilterChanged: "filter-changed",
  MarkSelectionChanged: "mark-selection-changed",
  SummaryDataChanged: "summary-data-changed",
  ParameterChanged: "parameter-changed",
  DashboardLayoutChanged: "dashboard-layout-changed",
  WorkbookFormattingChanged: "workbook-formatting-changed",
} as const;

export type TableauExtensionLike = {
  initializeAsync(): Promise<void>;
  dashboardContent: {
    dashboard: {
      name: string;
      worksheets: Array<{
        name: string;
        getFiltersAsync(): Promise<Array<{ name: string; type: string }>>;
        getParametersAsync(): Promise<Array<{ name: string; value: unknown }>>;
        addEventListener(eventType: string, handler: () => void): () => void;
      }>;
      findParameterAsync(name: string): Promise<{
        name: string;
        addEventListener(eventType: string, handler: () => void): () => void;
      } | undefined>;
      addEventListener(eventType: string, handler: () => void): () => void;
    };
  };
};

export type BootstrapTableauExtensionInput = {
  tableauApi: TableauExtensionLike;
  bridgeUrl: string;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
};

export async function bootstrapTableauExtension(input: BootstrapTableauExtensionInput): Promise<void> {
  const fetchFn: (url: string, init?: RequestInit) => Promise<Response> = input.fetchImpl ?? ((url, init) => fetch(url, init));

  await input.tableauApi.initializeAsync();
  const dashboard = input.tableauApi.dashboardContent.dashboard;

  const sync = async () => {
    const context = await collectTableauLiveContext(dashboard);
    await publishTableauContextToBridge({
      bridgeUrl: input.bridgeUrl,
      context,
      fetchImpl: fetchFn,
    });
  };

  await sync();

  for (const worksheet of dashboard.worksheets) {
    worksheet.addEventListener(TableauEventType.FilterChanged, () => {
      void sync();
    });
    worksheet.addEventListener(TableauEventType.MarkSelectionChanged, () => {
      void sync();
    });
    worksheet.addEventListener(TableauEventType.SummaryDataChanged, () => {
      void sync();
    });
  }

  dashboard.addEventListener(TableauEventType.DashboardLayoutChanged, () => {
    void sync();
  });
  dashboard.addEventListener(TableauEventType.WorkbookFormattingChanged, () => {
    void sync();
  });

  const parameterNames = new Set<string>();
  for (const worksheet of dashboard.worksheets) {
    const parameters = await worksheet.getParametersAsync();
    for (const parameter of parameters) {
      parameterNames.add(parameter.name);
    }
  }

  for (const parameterName of parameterNames) {
    const parameter = await dashboard.findParameterAsync(parameterName);
    if (!parameter) continue;
    parameter.addEventListener(TableauEventType.ParameterChanged, () => {
      void sync();
    });
  }
}
