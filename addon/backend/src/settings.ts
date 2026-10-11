import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { initialSettings, isCleaningSettings, type CleaningSettings } from "./cleaning.js";

type SavedSettings = Record<string, CleaningSettings>;
const dataDir = process.env.DATA_DIR ?? (process.env.NODE_ENV === "production" ? "/data" : path.resolve("data"));
const file = path.join(dataDir, "settings.json");
let writeQueue = Promise.resolve();

async function readAll(): Promise<SavedSettings> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Configurazione non valida");
    return parsed as SavedSettings;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export async function getDefaults(entityId: string): Promise<CleaningSettings> {
  await writeQueue;
  const stored = (await readAll())[entityId];
  return isCleaningSettings(stored) ? stored : initialSettings;
}

export async function saveDefault(entityId: string, settings: CleaningSettings): Promise<void> {
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    const all = await readAll();
    all[entityId] = settings;
    await mkdir(dataDir, { recursive: true });
    const tempFile = `${file}.tmp`;
    await writeFile(tempFile, JSON.stringify(all, null, 2), { mode: 0o600 });
    await rename(tempFile, file);
  });
  await writeQueue;
}
