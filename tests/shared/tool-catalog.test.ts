import { describe, expect, test } from "bun:test";
import { buildTableauToolCatalog } from "../../src/shared/tool-catalog";

describe("buildTableauToolCatalog", () => {
  test("define las tools base del MVP", () => {
    expect(buildTableauToolCatalog()).toEqual([
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
    ]);
  });
});
