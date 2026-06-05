export type TableauToolDefinition = {
  name: "tableau_get_live_context" | "tableau_apply_filter";
  description: string;
  readOnly: boolean;
  requiresConfirmation: boolean;
};

export function buildTableauToolCatalog(): TableauToolDefinition[] {
  return [
    {
      name: "tableau_get_live_context",
      description: "Lee el contexto activo del dashboard abierto en Tableau Desktop.",
      readOnly: true,
      requiresConfirmation: false,
    },
    {
      name: "tableau_apply_filter",
      description: "Aplica un filtro al dashboard activo mediante el bridge local.",
      readOnly: false,
      requiresConfirmation: true,
    },
  ];
}
