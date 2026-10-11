import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { haRequest, isAction, isEntityId, isVacuumState, type VacuumState } from "./ha.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/vacuums", async (_req, res) => {
  try {
    const states = await haRequest("/states");
    if (!Array.isArray(states)) throw new Error("Risposta stati non valida");
    res.json(states.filter(isVacuumState) as VacuumState[]);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Home Assistant non disponibile" });
  }
});

app.post("/api/vacuums/:entityId/:action", async (req, res) => {
  const { entityId, action } = req.params;
  if (!isEntityId(entityId) || !isAction(action)) {
    res.status(400).json({ error: "Comando o entità non validi" });
    return;
  }
  try {
    const state = await haRequest(`/states/${entityId}`);
    if (!isVacuumState(state)) {
      res.status(404).json({ error: "Entità aspirapolvere non trovata" });
      return;
    }
    await haRequest(`/services/vacuum/${action}`, {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId }),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Comando non riuscito" });
  }
});

const publicDir = process.env.FRONTEND_DIR ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public");
app.use(express.static(publicDir));
app.get("*", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

const port = Number(process.env.PORT ?? 8103);
app.listen(port, "0.0.0.0", () => console.log(`Dreame Controller in ascolto sulla porta ${port}`));

