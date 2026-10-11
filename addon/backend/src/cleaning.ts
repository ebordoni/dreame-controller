import type { VacuumState } from "./ha.js";

export type CleaningSettings = { suctionLevel: number; repeats: number };
export type Room = { id: number; name: string };
export const initialSettings: CleaningSettings = { suctionLevel: 1, repeats: 1 };

export function roomsFor(state: VacuumState): Room[] {
  const maps = state.attributes.rooms;
  if (!maps || typeof maps !== "object") return [];
  const selected = state.attributes.selected_map;
  const rooms = (selected && maps[selected]) || Object.values(maps)[0];
  if (!Array.isArray(rooms)) return [];
  return rooms.filter((room): room is Room => Number.isInteger(room?.id) && room.id > 0 && typeof room.name === "string");
}

export function mapKeyFor(state: VacuumState): string {
  const index = state.attributes.selected_map_index;
  return Number.isInteger(index) && index! > 0 ? String(index) : "1";
}

export function isCleaningSettings(value: unknown): value is CleaningSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return Number.isInteger(settings.suctionLevel) && Number(settings.suctionLevel) >= 0 && Number(settings.suctionLevel) <= 3 &&
    Number.isInteger(settings.repeats) && Number(settings.repeats) >= 1 && Number(settings.repeats) <= 3;
}

export function makeCleaningPayload(entityId: string, rooms: Array<{ id: number } & CleaningSettings>) {
  const segments = rooms.map((room) => room.id);
  const suction = rooms.map((room) => room.suctionLevel);
  const repeats = rooms.map((room) => room.repeats);
  return {
    entity_id: entityId,
    segments: segments.length === 1 ? segments[0] : segments,
    suction_level: suction.length === 1 ? suction[0] : suction,
    repeats: repeats.length === 1 ? repeats[0] : repeats,
  };
}
