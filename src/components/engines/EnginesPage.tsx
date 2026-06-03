import { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Center,
  Divider,
  Group,
  Input,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconCpu,
  IconFolder,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { createDefaultSettings, enginesAtom, selectedEngineIdAtom } from "../../state/engineStore";
import type { EngineHandshake, EngineOptionConfig, LocalEngineConfig } from "../../types/engine";

const requiredSettings = ["MultiPV", "Threads", "Hash"];

export default function EnginesPage() {
  const [engines, setEngines] = useAtom(enginesAtom);
  const [selectedEngineId, setSelectedEngineId] = useAtom(selectedEngineIdAtom);
  const [search, setSearch] = useState("");
  const [addOpened, setAddOpened] = useState(false);

  const filteredEngines = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return engines;
    return engines.filter((engine) =>
      [engine.name, engine.path, engine.protocol, engine.author ?? ""]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [engines, search]);

  const selectedEngine =
    engines.find((engine) => engine.id === selectedEngineId) ?? engines[0] ?? null;

  const upsertEngine = (engine: LocalEngineConfig) => {
    setEngines((prev) => prev.map((item) => (item.id === engine.id ? engine : item)));
  };

  const removeEngine = (engineId: string) => {
    setEngines((prev) => prev.filter((engine) => engine.id !== engineId));
    if (selectedEngineId === engineId) {
      setSelectedEngineId(null);
    }
  };

  return (
    <Stack h="100%" p="md" gap="md" className="engines-page">
      <AddEngineModal
        opened={addOpened}
        onClose={() => setAddOpened(false)}
        onAdd={(engine) => {
          setEngines((prev) => [...prev, engine]);
          setSelectedEngineId(engine.id);
          setAddOpened(false);
        }}
      />

      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>引擎</Title>
          <Text c="dimmed" size="sm">
            管理本地 UCI 中国象棋引擎，Pikafish 可直接通过 UCI 接入。
          </Text>
        </div>
        <Tooltip label="添加引擎">
          <ActionIcon variant="default" size="lg" onClick={() => setAddOpened(true)}>
            <IconPlus size="1.1rem" />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group grow align="stretch" gap="md" className="engines-page-grid">
        <Paper withBorder className="engines-list-panel">
          <Stack gap={0} h="100%">
            <Group p="xs" gap="xs">
              <Input
                size="sm"
                style={{ flexGrow: 1 }}
                leftSection={<IconSearch size="1rem" />}
                placeholder="搜索引擎"
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
              />
              <Tooltip label="添加引擎">
                <ActionIcon variant="default" size="lg" onClick={() => setAddOpened(true)}>
                  <IconPlus size="1rem" />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Divider />
            <ScrollArea flex={1}>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs" p="xs">
                {filteredEngines.map((engine) => (
                  <EngineCard
                    key={engine.id}
                    engine={engine}
                    selected={engine.id === selectedEngine?.id}
                    onClick={() => setSelectedEngineId(engine.id)}
                  />
                ))}
              </SimpleGrid>
            </ScrollArea>
            {filteredEngines.length === 0 && (
              <Center h="100%">
                <Stack align="center" gap="sm">
                  <ThemeIcon size={64} radius="xl" variant="light" color="gray">
                    <IconCpu size={32} />
                  </ThemeIcon>
                  <Text c="dimmed" fw={500}>
                    {engines.length === 0 ? "还没有添加引擎" : "没有匹配结果"}
                  </Text>
                  {engines.length === 0 && (
                    <Button leftSection={<IconPlus size="1rem" />} onClick={() => setAddOpened(true)}>
                      添加本地引擎
                    </Button>
                  )}
                </Stack>
              </Center>
            )}
          </Stack>
        </Paper>

        <Paper withBorder p="md" className="engines-settings-panel">
          {selectedEngine ? (
            <EngineSettings
              engine={selectedEngine}
              onChange={upsertEngine}
              onRemove={() => removeEngine(selectedEngine.id)}
            />
          ) : (
            <Center h="100%">
              <Stack align="center" gap="sm">
                <ThemeIcon size={80} radius="xl" variant="light" color="gray">
                  <IconCpu size={40} />
                </ThemeIcon>
                <Text c="dimmed" fw={500} size="lg">
                  选择一个引擎查看设置
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Group>
    </Stack>
  );
}

function EngineCard({
  engine,
  selected,
  onClick,
}: {
  engine: LocalEngineConfig;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      className="engine-card"
      data-selected={selected || undefined}
      onClick={onClick}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon variant="light" color={engine.enabled ? "blue" : "gray"}>
              <IconCpu size="1rem" />
            </ThemeIcon>
            <div style={{ minWidth: 0 }}>
              <Text fw={700} truncate>
                {engine.name}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {engine.path}
              </Text>
            </div>
          </Group>
          <Badge variant="light" color={engine.protocol === "uci" ? "blue" : "gray"}>
            {engine.protocol.toUpperCase()}
          </Badge>
        </Group>
        <Group gap="xs">
          <Badge size="sm" variant="outline">
            {engine.go.type === "depth" ? `${engine.go.value} 层` : `${engine.go.value} ms`}
          </Badge>
          <Badge size="sm" color={engine.enabled ? "green" : "gray"} variant="light">
            {engine.enabled ? "启用" : "停用"}
          </Badge>
        </Group>
      </Stack>
    </Paper>
  );
}

function AddEngineModal({
  opened,
  onClose,
  onAdd,
}: {
  opened: boolean;
  onClose: () => void;
  onAdd: (engine: LocalEngineConfig) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [handshake, setHandshake] = useState<EngineHandshake | null>(null);

  const chooseEngine = async () => {
    const selected = await open({
      title: "选择引擎可执行文件",
      multiple: false,
      filters: [
        { name: "Engine", extensions: ["exe", "bin"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!selected || typeof selected !== "string") return;

    setLoading(true);
    setError(null);
    setPath(selected);
    try {
      const config = await invoke<EngineHandshake>("get_engine_config", { path: selected });
      setHandshake(config);
      setName(config.name);
    } catch (event) {
      setHandshake(null);
      setName(selected.split(/[/\\]/).pop() || "本地引擎");
      setError(String(event));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!path || !name) return;
    const engine: LocalEngineConfig = {
      id: crypto.randomUUID(),
      name,
      path,
      protocol: "uci",
      author: handshake?.author ?? null,
      enabled: true,
      go: { type: "depth", value: 12 },
      options: handshake?.options ?? [],
      settings: {},
      lastVerifiedAt: handshake ? Date.now() : undefined,
    };
    engine.settings = createDefaultSettings(engine);
    onAdd(engine);
    setPath("");
    setName("");
    setHandshake(null);
    setError(null);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="添加本地引擎" size="lg">
      <Stack>
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text fw={700}>本地 UCI 引擎</Text>
            <Text size="sm" c="dimmed">
              Pikafish 源码使用 UCI 协议。请选择编译后的 Pikafish 可执行文件，楚汉会发送
              `uci` 并读取引擎名称和选项。
            </Text>
            <Button
              variant="default"
              leftSection={<IconUpload size="1rem" />}
              loading={loading}
              onClick={chooseEngine}
            >
              选择二进制文件
            </Button>
          </Stack>
        </Paper>

        <TextInput label="路径" value={path} readOnly leftSection={<IconFolder size="1rem" />} />
        <TextInput
          label="名称"
          value={name}
          placeholder="选择文件后自动识别"
          onChange={(event) => setName(event.currentTarget.value)}
        />

        {handshake && (
          <Paper withBorder p="sm" radius="md">
            <Group gap="xs">
              <Badge color="green" variant="light">
                UCI OK
              </Badge>
              <Badge variant="light">{handshake.options.length} 个选项</Badge>
              {handshake.author && <Badge variant="outline">{handshake.author}</Badge>}
            </Group>
          </Paper>
        )}

        {error && (
          <Text size="sm" c="red">
            {error}
          </Text>
        )}

        <Group justify="end">
          <Button variant="default" onClick={onClose}>
            取消
          </Button>
          <Button disabled={!path || !name} onClick={handleAdd}>
            添加
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function EngineSettings({
  engine,
  onChange,
  onRemove,
}: {
  engine: LocalEngineConfig;
  onChange: (engine: LocalEngineConfig) => void;
  onRemove: () => void;
}) {
  const visibleOptions = engine.options.filter((option) => option.kind !== "button");
  const requiredOptions = visibleOptions.filter((option) => requiredSettings.includes(option.name));
  const advancedOptions = visibleOptions.filter((option) => !requiredSettings.includes(option.name));

  const setSetting = (name: string, value: string | number | boolean | null) => {
    onChange({
      ...engine,
      settings: {
        ...engine.settings,
        [name]: value,
      },
    });
  };

  return (
    <ScrollArea h="100%" offsetScrollbars>
      <Stack>
        <Group justify="space-between" align="start">
          <div>
            <Title order={3}>{engine.name}</Title>
            <Text c="dimmed" size="sm">
              {engine.path}
            </Text>
          </div>
          <Group gap="xs">
            <Badge variant="light">{engine.protocol.toUpperCase()}</Badge>
            <Badge color={engine.enabled ? "green" : "gray"} variant="light">
              {engine.enabled ? "启用" : "停用"}
            </Badge>
          </Group>
        </Group>

        <Divider variant="dashed" label="通用设置" />
        <Group grow align="start">
          <TextInput
            label="名称"
            value={engine.name}
            onChange={(event) => onChange({ ...engine, name: event.currentTarget.value })}
          />
          <Select
            label="协议"
            value={engine.protocol}
            data={[
              { value: "uci", label: "UCI" },
              { value: "ucci", label: "UCCI（预留）", disabled: true },
            ]}
            onChange={(value) =>
              onChange({ ...engine, protocol: value === "ucci" ? "ucci" : "uci" })
            }
          />
          <Switch
            label="启用"
            checked={engine.enabled}
            onChange={(event) => onChange({ ...engine, enabled: event.currentTarget.checked })}
          />
        </Group>

        <Divider variant="dashed" label="搜索设置" />
        <Group grow align="end">
          <Select
            label="搜索模式"
            value={engine.go.type}
            data={[
              { value: "depth", label: "固定深度" },
              { value: "movetime", label: "固定时间" },
            ]}
            onChange={(value) =>
              onChange({
                ...engine,
                go: {
                  type: value === "movetime" ? "movetime" : "depth",
                  value: value === "movetime" ? 1000 : 12,
                },
              })
            }
          />
          <NumberInput
            label={engine.go.type === "depth" ? "深度" : "时间 (ms)"}
            min={engine.go.type === "depth" ? 1 : 100}
            max={engine.go.type === "depth" ? 256 : 600000}
            step={engine.go.type === "depth" ? 1 : 100}
            value={engine.go.value}
            onChange={(value) =>
              onChange({
                ...engine,
                go: { ...engine.go, value: typeof value === "number" ? value : engine.go.value },
              })
            }
          />
        </Group>

        {requiredOptions.length > 0 && (
          <>
            <Divider variant="dashed" label="常用 UCI 选项" />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {requiredOptions.map((option) => (
                <OptionInput
                  key={option.name}
                  option={option}
                  value={engine.settings[option.name] ?? option.default}
                  onChange={(value) => setSetting(option.name, value)}
                />
              ))}
            </SimpleGrid>
          </>
        )}

        {advancedOptions.length > 0 && (
          <>
            <Divider variant="dashed" label="高级选项" />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {advancedOptions.map((option) => (
                <OptionInput
                  key={option.name}
                  option={option}
                  value={engine.settings[option.name] ?? option.default}
                  onChange={(value) => setSetting(option.name, value)}
                />
              ))}
            </SimpleGrid>
          </>
        )}

        <Group justify="end">
          <Button
            variant="default"
            onClick={() => onChange({ ...engine, settings: createDefaultSettings(engine) })}
          >
            重置选项
          </Button>
          <Button color="red" leftSection={<IconTrash size="1rem" />} onClick={onRemove}>
            移除
          </Button>
        </Group>
      </Stack>
    </ScrollArea>
  );
}

function OptionInput({
  option,
  value,
  onChange,
}: {
  option: EngineOptionConfig;
  value: string | number | boolean | null;
  onChange: (value: string | number | boolean | null) => void;
}) {
  if (option.kind === "spin") {
    return (
      <NumberInput
        label={option.name}
        value={typeof value === "number" ? value : Number(value ?? option.default ?? 0)}
        min={option.min ?? undefined}
        max={option.max ?? undefined}
        onChange={(next) => onChange(typeof next === "number" ? next : option.default)}
      />
    );
  }

  if (option.kind === "check") {
    return (
      <Switch
        label={option.name}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }

  if (option.kind === "combo") {
    return (
      <Select
        label={option.name}
        value={typeof value === "string" ? value : String(value ?? "")}
        data={option.vars.map((item) => ({ value: item, label: item }))}
        onChange={(next) => onChange(next ?? option.default)}
      />
    );
  }

  return (
    <TextInput
      label={option.name}
      value={typeof value === "string" ? value : String(value ?? "")}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}
