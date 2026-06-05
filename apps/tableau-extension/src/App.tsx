import { useEffect, useState } from "react";
import { bootstrapTableauExtension } from "./lib/bootstrap-tableau-extension";

const BRIDGE_URL = import.meta.env.VITE_TABLEAU_MCP_BRIDGE_URL ?? "http://127.0.0.1:3937";

export function App() {
  const [estado, setEstado] = useState<"inicializando" | "sin-tableau" | "sincronizado" | "error">("inicializando");
  const [mensaje, setMensaje] = useState("Esperando Tableau Desktop...");

  useEffect(() => {
    const tableauApi = (window as Window & { tableau?: unknown }).tableau as unknown;
    if (!tableauApi) {
      setEstado("sin-tableau");
      setMensaje("Esta vista se ejecuta dentro de Tableau Desktop.");
      return;
    }

    void bootstrapTableauExtension({
      tableauApi: tableauApi as never,
      bridgeUrl: BRIDGE_URL,
    })
      .then(() => {
        setEstado("sincronizado");
        setMensaje(`Conectado al bridge en ${BRIDGE_URL}`);
      })
      .catch((error) => {
        setEstado("error");
        setMensaje(error instanceof Error ? error.message : "No se pudo sincronizar la extensión.");
      });
  }, []);

  return (
    <main className="app-shell">
      <section className="card">
        <p className="eyebrow">Tableau Extension</p>
        <h1>Dashboard Assistant</h1>
        <p>{mensaje}</p>
        <div className={`status status-${estado}`}>
          {estado === "sincronizado"
            ? "Activo"
            : estado === "error"
              ? "Error"
              : estado === "sin-tableau"
                ? "Fuera de Tableau"
                : "Inicializando"}
        </div>
      </section>
    </main>
  );
}
