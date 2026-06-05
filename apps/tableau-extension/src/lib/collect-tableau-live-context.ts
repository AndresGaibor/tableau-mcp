export type TableauFilterSummary = {
  worksheetName: string;
  fieldName: string;
  type: string;
};

export type TableauParameterSummary = {
  name: string;
  value: unknown;
};

export type TableauWorksheetLike = {
  name: string;
  getFiltersAsync(): Promise<Array<{ name: string; type: string }> | Array<Record<string, unknown>>>;
  getParametersAsync(): Promise<Array<{ name: string; value: unknown }> | Array<Record<string, unknown>>>;
};

export type TableauDashboardLike = {
  name: string;
  worksheets: TableauWorksheetLike[];
};

export type TableauLiveContext = {
  dashboardName: string;
  worksheets: Array<{ name: string }>;
  filters: TableauFilterSummary[];
  parameters: TableauParameterSummary[];
};

export async function collectTableauLiveContext(dashboard: TableauDashboardLike): Promise<TableauLiveContext> {
  const filters: TableauFilterSummary[] = [];
  const parametersByName = new Map<string, TableauParameterSummary>();

  for (const worksheet of dashboard.worksheets) {
    const worksheetFilters = await worksheet.getFiltersAsync();
    for (const filter of worksheetFilters) {
      const fieldName = String(filter.name ?? "");
      const type = String(filter.type ?? "unknown");
      filters.push({ worksheetName: worksheet.name, fieldName, type });
    }

    const worksheetParameters = await worksheet.getParametersAsync();
    for (const parameter of worksheetParameters) {
      const name = String(parameter.name ?? "");
      if (!parametersByName.has(name)) {
        parametersByName.set(name, {
          name,
          value: parameter.value,
        });
      }
    }
  }

  return {
    dashboardName: dashboard.name,
    worksheets: dashboard.worksheets.map((worksheet) => ({ name: worksheet.name })),
    filters,
    parameters: [...parametersByName.values()],
  };
}
