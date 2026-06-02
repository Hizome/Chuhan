import { useState, useRef } from "react";
import {
  Paper,
  Stack,
  Text,
  Button,
  Textarea,
  Select,
  Group,
  Badge,
} from "@mantine/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useEngine } from "../hooks/useEngine";

interface EnginePanelProps {
  engineId: string;
  title?: string;
  onBestMove?: (move: string) => void;
}

export default function EnginePanel({
  engineId,
  title = "引擎",
  onBestMove,
}: EnginePanelProps) {
  const { output, stats, isRunning, spawn, sendCommand, kill } =
    useEngine(engineId);
  const [depth, setDepth] = useState<string | null>("0");
  const [time, setTime] = useState<string | null>("1");
  const [side, setSide] = useState<string | null>("2");
  const commandRef = useRef<HTMLInputElement>(null);

  const handleLoad = async () => {
    const path = await open({
      title: "加载引擎",
      defaultPath: "../engines",
      filters: [{ name: "引擎", extensions: ["exe", ""] }],
    });
    if (path) {
      await spawn(path);
      await sendCommand("uci");
      await sendCommand("ucinewgame");
    }
  };

  const handleGo = async () => {
    if (!isRunning) return;
    const d = parseInt(depth || "0");
    const t = parseInt(time || "0");
    if (d > 0) {
      await sendCommand(`go depth ${d}`);
    } else if (t > 0) {
      await sendCommand(`go movetime ${t * 1000}`);
    }
  };

  return (
    <Paper withBorder p="xs" style={{ height: "100%" }}>
      <Stack gap="xs" style={{ height: "100%" }}>
        <Text fw={700} size="sm">
          {title}
        </Text>

        <Group gap="xs">
          <Badge color="blue" variant="light">
            Depth: {stats.depth}
          </Badge>
          <Badge color="red" variant="light">
            Score: {stats.score}
          </Badge>
          <Badge color="green" variant="light">
            Knps: {stats.knps}
          </Badge>
        </Group>

        <Textarea
          value={output}
          readOnly
          styles={{
            wrapper: { flex: 1 },
            input: { fontFamily: "monospace", fontSize: 12 },
          }}
        />

        <Group gap="xs">
          <Button size="compact-sm" onClick={handleLoad} disabled={isRunning}>
            加载
          </Button>
          <Button size="compact-sm" onClick={handleGo} disabled={!isRunning}>
            思考
          </Button>
          <Button size="compact-sm" color="red" onClick={kill} disabled={!isRunning}>
            停止
          </Button>
        </Group>

        <Group gap="xs">
          <Select
            size="xs"
            label="固定深度"
            data={Array.from({ length: 11 }, (_, i) => ({
              value: String(i),
              label: i === 0 ? "N/A" : `${i} 层`,
            }))}
            value={depth}
            onChange={setDepth}
            style={{ flex: 1 }}
          />
          <Select
            size="xs"
            label="固定时间"
            data={Array.from({ length: 11 }, (_, i) => ({
              value: String(i),
              label: i === 0 ? "N/A" : `${i} 秒`,
            }))}
            value={time}
            onChange={setTime}
            style={{ flex: 1 }}
          />
        </Group>

        <Select
          size="xs"
          label="引擎方"
          data={[
            { value: "0", label: "引擎执红" },
            { value: "1", label: "引擎执黑" },
            { value: "2", label: "分析模式" },
          ]}
          value={side}
          onChange={setSide}
        />
      </Stack>
    </Paper>
  );
}
