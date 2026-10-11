export type VacuumState = {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    battery_level?: number;
    battery?: number;
    fan_speed?: string;
    supported_features?: number;
  };
};

const baseUrl = (process.env.HA_BASE_URL ?? "http://supervisor/core/api").replace(/\/$/, "");
const token = process.env.HA_TOKEN ?? process.env.SUPERVISOR_TOKEN;

export async function haRequest(path: string, init?: RequestInit): Promise<unknown> {
  if (!token) throw new Error("Token Home Assistant non configurato");
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Home Assistant ha risposto ${response.status}`);
  return response.json();
}

export function isVacuumState(value: unknown): value is VacuumState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.entity_id === "string" &&
    candidate.entity_id.startsWith("vacuum.") &&
    typeof candidate.state === "string" &&
    typeof candidate.attributes === "object" && candidate.attributes !== null;
}

export const actions = {
  start: "start",
  pause: "pause",
  stop: "stop",
  return_to_base: "return_to_base",
} as const;

export function isAction(value: string): value is keyof typeof actions {
  return Object.hasOwn(actions, value);
}

export function isEntityId(value: string): boolean {
  return /^vacuum\.[a-z0-9_]+$/.test(value);
}
