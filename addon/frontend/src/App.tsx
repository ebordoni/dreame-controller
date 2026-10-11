import { useEffect, useState } from "react";
import {
  Alert, Badge, Button, Card, Checkbox, Group, Loader, Select, Stack, Tabs, Text, Title,
} from "@mantine/core";

type Settings = { suctionLevel: number; repeats: number };
type Room = { id: number; name: string };
type Vacuum = {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    battery_level?: number;
    battery?: number;
    fan_speed?: string;
    fan_speed_list?: string[];
    customized_cleaning?: boolean;
    cleaning_sequence?: unknown;
  };
  mapKey: string;
  rooms: Room[];
};

const initialSettings: Settings = { suctionLevel: 1, repeats: 1 };
const suctionNames = ["Silenziosa", "Standard", "Forte", "Turbo"];
const apiUrl = (path: string) => {
  const base = window.location.pathname.replace(/\/+$/, "");
  return base + path;
};

async function jsonRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Richiesta non riuscita");
  return body as T;
}

function SettingsFields({
  value, onChange, maxSuction,
}: {
  value: Settings;
  onChange: (value: Settings) => void;
  maxSuction: number;
}) {
  return (
    <Group align="end" grow>
      <Select
        label="Potenza di aspirazione"
        data={suctionNames.slice(0, maxSuction + 1).map((name, index) => ({
          value: String(index), label: name,
        }))}
        value={String(Math.min(value.suctionLevel, maxSuction))}
        onChange={(selection) => {
          if (selection !== null) onChange({ ...value, suctionLevel: Number(selection) });
        }}
        allowDeselect={false}
      />
      <Select
        label="Passate"
        data={["1", "2", "3"]}
        value={String(value.repeats)}
        onChange={(selection) => {
          if (selection !== null) onChange({ ...value, repeats: Number(selection) });
        }}
        allowDeselect={false}
      />
    </Group>
  );
}

export default function App() {
  const [vacuums, setVacuums] = useState<Vacuum[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mapError, setMapError] = useState(false);
  const [defaults, setDefaults] = useState<Settings>(initialSettings);
  const [defaultDraft, setDefaultDraft] = useState<Settings>(initialSettings);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);
  const [overrides, setOverrides] = useState<Record<number, Settings>>({});
  const selected = vacuums.find((vacuum) => vacuum.entity_id === selectedId);
  const maxSuction = Math.min(3, (selected?.attributes.fan_speed_list?.length ?? 4) - 1);
  const sequence = selected?.attributes.cleaning_sequence;
  const incompatibleSettings = Boolean(selected?.attributes.customized_cleaning ||
    (Array.isArray(sequence) ? sequence.length > 0 : sequence));

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const data = await jsonRequest<Vacuum[]>("/api/vacuums");
        if (!active) return;
        setVacuums(data);
        setSelectedId((current) => data.some((vacuum) => vacuum.entity_id === current)
          ? current : (data[0]?.entity_id ?? ""));
        setError("");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Impossibile caricare i robot");
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setSelectedRooms([]);
    setOverrides({});
    setMapError(false);
    void jsonRequest<{ settings: Settings }>("/api/vacuums/" + selectedId + "/defaults")
      .then(({ settings }) => {
        if (active) { setDefaults(settings); setDefaultDraft(settings); }
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Impossibile caricare i predefiniti");
      });
    return () => { active = false; };
  }, [selectedId, selected?.mapKey]);

  const run = async (path: string, options: RequestInit, success: string): Promise<boolean> => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await jsonRequest(path, options);
      setNotice(success);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Comando non riuscito");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveDefaults = async () => {
    if (!selected) return;
    const settings = { ...defaultDraft, suctionLevel: Math.min(defaultDraft.suctionLevel, maxSuction) };
    const saved = await run("/api/vacuums/" + selectedId + "/defaults", {
      method: "PUT", body: JSON.stringify(settings),
    }, "Predefiniti salvati");
    if (saved) {
      setDefaults(settings);
      setDefaultDraft(settings);
    }
  };

  const cleanRooms = async () => {
    if (!selected) return;
    const rooms = selected.rooms.filter((room) => selectedRooms.includes(room.id))
      .map((room) => ({ id: room.id, ...(overrides[room.id] ?? defaults) }));
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await jsonRequest("/api/vacuums/" + selectedId + "/clean-rooms", {
        method: "POST", body: JSON.stringify({ rooms }),
      });
      setSelectedRooms([]);
      setOverrides({});
      setNotice("Comando di pulizia inviato");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pulizia non avviata");
    } finally {
      setBusy(false);
    }
  };

  const action = (name: string, success: string) => {
    if (!selected) return;
    void run("/api/vacuums/" + selectedId + "/" + name, { method: "POST" }, success);
  };

  return (
    <Stack maw={900} mx="auto" p="md" gap="md">
      <Title order={1}>Dreame Controller</Title>
      {loading && <Loader />}
      {error && <Alert color="red" title="Errore">{error}</Alert>}
      {notice && <Alert color="green">{notice}</Alert>}
      {!loading && vacuums.length === 0 && <Alert>Nessun robot aspirapolvere disponibile in Home Assistant.</Alert>}
      {vacuums.length > 1 && (
        <Select label="Robot" data={vacuums.map((vacuum) => ({
          value: vacuum.entity_id, label: vacuum.attributes.friendly_name ?? vacuum.entity_id,
        }))} value={selectedId} onChange={(value) => { if (value) setSelectedId(value); }} />
      )}
      {selected && (
        <>
          <Card withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={2}>{selected.attributes.friendly_name ?? selected.entity_id}</Title>
                <Badge>{selected.state}</Badge>
              </Group>
              <Text>Batteria: {selected.attributes.battery_level ?? selected.attributes.battery ?? "—"}%</Text>
              <Text>Potenza attuale: {selected.attributes.fan_speed ?? "—"}</Text>
              <Group>
                <Button loading={busy} onClick={() => action("start", "Pulizia avviata")}>Avvia tutto</Button>
                <Button loading={busy} variant="light" onClick={() => action("pause", "Pulizia in pausa")}>Pausa</Button>
                <Button loading={busy} variant="light" onClick={() => action("stop", "Pulizia fermata")}>Ferma</Button>
                <Button loading={busy} variant="light" onClick={() => action("return_to_base", "Ritorno alla base avviato")}>Base</Button>
              </Group>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack gap="sm">
              <Title order={2}>Mappa</Title>
              {mapError
                ? <Alert color="yellow">Immagine della mappa non disponibile. Puoi comunque selezionare le stanze qui sotto.</Alert>
                : <img
                    src={apiUrl("/api/vacuums/" + selectedId + "/map?v=" + Math.floor(Date.now() / 30000))}
                    alt="Mappa corrente del robot"
                    onError={() => setMapError(true)}
                    style={{ width: "100%", maxHeight: 520, objectFit: "contain" }}
                  />}
            </Stack>
          </Card>

          <Card withBorder>
            <Tabs defaultValue="clean">
              <Tabs.List>
                <Tabs.Tab value="clean">Nuova pulizia</Tabs.Tab>
                <Tabs.Tab value="defaults">Predefiniti</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="clean" pt="md">
                <Stack>
                  <Text>Seleziona le stanze. Ogni stanza usa i predefiniti, salvo le modifiche impostate qui per questa pulizia.</Text>
                  {incompatibleSettings && (
                    <Alert color="yellow">Disattiva la pulizia personalizzata e la sequenza stanze nell’integrazione Dreame Vacuum: altrimenti il robot ignora potenza e passate indicate qui.</Alert>
                  )}
                  {selected.rooms.length === 0 && <Alert>Nessuna stanza disponibile nella mappa selezionata.</Alert>}
                  {selected.rooms.map((room) => {
                    const checked = selectedRooms.includes(room.id);
                    const effective = overrides[room.id] ?? defaults;
                    return (
                      <Card key={room.id} withBorder padding="sm">
                        <Stack gap="xs">
                          <Checkbox
                            label={room.name}
                            checked={checked}
                            onChange={(event) => setSelectedRooms((current) =>
                              event.currentTarget.checked
                                ? [...current, room.id]
                                : current.filter((id) => id !== room.id))}
                          />
                          {checked && (
                            <>
                              <SettingsFields
                                value={effective}
                                maxSuction={maxSuction}
                                onChange={(value) => setOverrides((current) => ({ ...current, [room.id]: value }))}
                              />
                              {overrides[room.id] && (
                                <Button size="compact-sm" variant="subtle" onClick={() => setOverrides((current) => {
                                  const next = { ...current };
                                  delete next[room.id];
                                  return next;
                                })}>Usa i predefiniti</Button>
                              )}
                            </>
                          )}
                        </Stack>
                      </Card>
                    );
                  })}
                  <Button
                    loading={busy}
                    disabled={busy || selectedRooms.length === 0 || incompatibleSettings || maxSuction < 0 ||
                      selected.state === "unavailable" || selected.state === "unknown"}
                    onClick={() => void cleanRooms()}
                  >
                    Pulisci {selectedRooms.length} {selectedRooms.length === 1 ? "stanza" : "stanze"}
                  </Button>
                </Stack>
              </Tabs.Panel>
              <Tabs.Panel value="defaults" pt="md">
                <Stack>
                  <Text>Queste impostazioni valgono per tutte le stanze e per le prossime pulizie avviate da questa applicazione.</Text>
                  <SettingsFields value={defaultDraft} maxSuction={maxSuction} onChange={setDefaultDraft} />
                  <Button loading={busy} onClick={() => void saveDefaults()}>Salva predefiniti</Button>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Card>
        </>
      )}
    </Stack>
  );
}
