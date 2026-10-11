import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { haFetch, haRequest, isAction, isEntityId, isVacuumState, type VacuumState } from "./ha.js";
import { isCleaningSettings, makeCleaningPayload, mapKeyFor, roomsFor } from "./cleaning.js";
import { getDefaults, saveDefault } from "./settings.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

async function vacuumState(entityId: string): Promise<VacuumState | null> {
  const state = await haRequest(`/states/${entityId}`);
  return isVacuumState(state) ? state : null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Home Assistant non disponibile";
}

app.get("/api/vacuums", async (_req, res) => {
  try {
    const states = await haRequest("/states");
    if (!Array.isArray(states)) throw new Error("Risposta stati non valida");
    res.json(states.filter(isVacuumState).map((state) => ({
      entity_id: state.entity_id,
      state: state.state,
      attributes: {
        friendly_name: state.attributes.friendly_name,
        battery_level: state.attributes.battery_level,
        battery: state.attributes.battery,
        fan_speed: state.attributes.fan_speed,
        fan_speed_list: state.attributes.fan_speed_list,
        customized_cleaning: state.attributes.customized_cleaning,
        cleaning_sequence: state.attributes.cleaning_sequence,
      },
      mapKey: mapKeyFor(state),
      rooms: roomsFor(state),
    })));
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

app.get("/api/vacuums/:entityId/defaults", async (req, res) => {
  const { entityId } = req.params;
  if (!isEntityId(entityId)) return void res.status(400).json({ error: "Entità non valida" });
  try {
    const state = await vacuumState(entityId);
    if (!state) return void res.status(404).json({ error: "Robot non trovato" });
    res.json({ settings: await getDefaults(entityId) });
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

app.put("/api/vacuums/:entityId/defaults", async (req, res) => {
  const { entityId } = req.params;
  if (!isEntityId(entityId) || !isCleaningSettings(req.body)) {
    return void res.status(400).json({ error: "Impostazioni non valide" });
  }
  try {
    const state = await vacuumState(entityId);
    if (!state) return void res.status(404).json({ error: "Robot non trovato" });
    await saveDefault(entityId, req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

app.get("/api/vacuums/:entityId/map", async (req, res) => {
  const { entityId } = req.params;
  if (!isEntityId(entityId)) return void res.status(400).json({ error: "Entità non valida" });
  try {
    const state = await vacuumState(entityId);
    if (!state) return void res.status(404).json({ error: "Robot non trovato" });
    const cameraId = `camera.${entityId.slice("vacuum.".length)}_map`;
    const camera = await haRequest(`/states/${cameraId}`);
    if (typeof camera !== "object" || camera === null || (camera as { entity_id?: string }).entity_id !== cameraId) {
      return void res.status(404).json({ error: "Mappa non disponibile" });
    }
    const image = await haFetch(`/camera_proxy/${cameraId}`);
    const contentType = image.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) throw new Error("Home Assistant non ha restituito un'immagine della mappa");
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=15");
    res.send(Buffer.from(await image.arrayBuffer()));
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

app.post("/api/vacuums/:entityId/clean-rooms", async (req, res) => {
  const { entityId } = req.params;
  if (!isEntityId(entityId)) return void res.status(400).json({ error: "Entità non valida" });
  const rooms: unknown = req.body?.rooms;
  if (!Array.isArray(rooms) || rooms.length === 0 || rooms.length > 30 || rooms.some((room) => !room ||
    typeof room !== "object" || !Number.isInteger(room.id) || !isCleaningSettings(room)) ||
    new Set(rooms.map((room) => room.id)).size !== rooms.length) {
    return void res.status(400).json({ error: "Seleziona stanze e valori validi" });
  }
  try {
    const state = await vacuumState(entityId);
    if (!state) return void res.status(404).json({ error: "Robot non trovato" });
    if (state.state === "unavailable" || state.state === "unknown") {
      return void res.status(409).json({ error: "Robot non disponibile" });
    }
    const sequence = state.attributes.cleaning_sequence;
    if (state.attributes.customized_cleaning || (Array.isArray(sequence) ? sequence.length > 0 : Boolean(sequence))) {
      return void res.status(409).json({ error: "Disattiva la pulizia personalizzata e la sequenza stanze in Dreame Vacuum: il robot ignorerebbe potenza e passate" });
    }
    const validIds = new Set(roomsFor(state).map((room) => room.id));
    const maxSuction = Math.min(3, (state.attributes.fan_speed_list?.length ?? 4) - 1);
    if (rooms.some((room) => !validIds.has(room.id) || room.suctionLevel > maxSuction)) {
      return void res.status(400).json({ error: "Stanza o potenza non disponibile nella mappa attuale" });
    }
    await haRequest("/services/dreame_vacuum/vacuum_clean_segment", {
      method: "POST",
      body: JSON.stringify(makeCleaningPayload(entityId, rooms)),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(502).json({ error: message(error) });
  }
});

app.post("/api/vacuums/:entityId/:action", async (req, res) => {
  const { entityId, action } = req.params;
  if (!isEntityId(entityId) || !isAction(action)) {
    res.status(400).json({ error: "Comando o entità non validi" });
    return;
  }
  try {
    const state = await vacuumState(entityId);
    if (!state) {
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
