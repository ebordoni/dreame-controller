import { Alert, Badge, Button, Card, Container, Group, Loader, Progress, Select, Stack, Text, Title } from "@mantine/core";
import { IconHome, IconPlayerPause, IconPlayerPlay, IconPlayerStop, IconRefresh, IconRobot } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

type Vacuum = {
  entity_id: string;
  state: string;
  attributes: { friendly_name?: string; battery_level?: number; battery?: number; fan_speed?: string };
};

const actions = [
  { id: "start", label: "Avvia / riprendi", icon: IconPlayerPlay },
  { id: "pause", label: "Pausa", icon: IconPlayerPause },
  { id: "stop", label: "Ferma", icon: IconPlayerStop },
  { id: "return_to_base", label: "Torna alla base", icon: IconHome },
] as const;

const stateLabels: Record<string, string> = {
  cleaning: "In pulizia",
  docked: "Alla base",
  idle: "In attesa",
  paused: "In pausa",
  returning: "Ritorno alla base",
  error: "Errore",
  unavailable: "Non disponibile",
};

export default function App() {
  const [vacuums, setVacuums] = useState<Vacuum[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("./api/vacuums");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Home Assistant non disponibile");
      setVacuums(body);
      setSelected((current) => current && body.some((item: Vacuum) => item.entity_id === current) ? current : body[0]?.entity_id ?? null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossibile leggere lo stato del robot");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const vacuum = vacuums.find((item) => item.entity_id === selected);
  const battery = vacuum?.attributes.battery_level ?? vacuum?.attributes.battery;

  async function runAction(action: string) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`./api/vacuums/${encodeURIComponent(selected)}/${action}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Comando non riuscito");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Comando non riuscito");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="start">
          <div>
            <Group gap="xs"><IconRobot size={28} /><Title order={1}>Dreame Controller</Title></Group>
            <Text c="dimmed">Controllo rapido del robot da Home Assistant</Text>
          </div>
          <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void refresh()}>Aggiorna</Button>
        </Group>
        {error && <Alert color="red" title="Connessione o comando non riuscito">{error}</Alert>}
        {loading ? <Loader /> : !vacuum ? (
          <Alert color="yellow" title="Nessun robot trovato">
            Configura Dreame Vacuum in Home Assistant e verifica che sia presente un'entità aspirapolvere.
          </Alert>
        ) : (
          <>
            {vacuums.length > 1 && <Select label="Robot" data={vacuums.map((item) => ({ value: item.entity_id, label: item.attributes.friendly_name ?? item.entity_id }))} value={selected} onChange={setSelected} />}
            <Card withBorder radius="lg" padding="xl">
              <Stack gap="lg">
                <Group justify="space-between">
                  <div>
                    <Title order={2}>{vacuum.attributes.friendly_name ?? vacuum.entity_id}</Title>
                    <Text c="dimmed" size="sm">{vacuum.entity_id}</Text>
                  </div>
                  <Badge color={vacuum.state === "error" || vacuum.state === "unavailable" ? "red" : "teal"} size="lg">
                    {stateLabels[vacuum.state] ?? vacuum.state}
                  </Badge>
                </Group>
                {typeof battery === "number" && (
                  <div>
                    <Group justify="space-between"><Text>Batteria</Text><Text fw={700}>{battery}%</Text></Group>
                    <Progress value={battery} mt="xs" />
                  </div>
                )}
                {vacuum.attributes.fan_speed && <Text size="sm">Aspirazione: {vacuum.attributes.fan_speed}</Text>}
                <Group grow>
                  {actions.map(({ id, label, icon: Icon }) => (
                    <Button key={id} variant={id === "start" ? "filled" : "light"} leftSection={<Icon size={18} />} loading={busy} disabled={vacuum.state === "unavailable"} onClick={() => void runAction(id)}>
                      {label}
                    </Button>
                  ))}
                </Group>
              </Stack>
            </Card>
          </>
        )}
      </Stack>
    </Container>
  );
}
