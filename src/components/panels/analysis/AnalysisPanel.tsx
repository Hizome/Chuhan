import { useState } from "react";
import {
  Paper,
  Tabs,
  ScrollArea,
  Accordion,
  Button,
  Group,
  Text,
  Progress,
  Select,
  Stack,
  Code,
  Badge,
} from "@mantine/core";
import { useAtom } from "jotai";
import type { TreeNode } from "../../../types/xiangqi";
import EvalChart from "../../common/EvalChart";
import { enginesAtom, selectedEngineIdAtom } from "../../../state/engineStore";

interface AnalysisPanelProps {
  root: TreeNode;
  position: number[];
  onNavigate: (path: number[]) => void;
  engineOutput: string;
  engineStats: {
    knps: string;
    score: string;
    depth: string;
    bestmove?: string;
    status?: string;
  };
  isEngineRunning: boolean;
  selectedEngineId: string | null;
  onStartEngine: (engineId: string) => Promise<void>;
  onStopEngine: () => Promise<void>;
}

export default function AnalysisPanel({
  root,
  position,
  onNavigate,
  engineOutput,
  engineStats,
  isEngineRunning,
  selectedEngineId,
  onStartEngine,
  onStopEngine,
}: AnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("engines");
  const [engines] = useAtom(enginesAtom);
  const [, setSelectedEngineId] = useAtom(selectedEngineIdAtom);
  const [busy, setBusy] = useState(false);

  // Parse engine output for PV lines
  const pvLines = parsePvLines(engineOutput);
  const enabledEngines = engines.filter((engine) => engine.enabled);
  const activeEngineId = selectedEngineId ?? enabledEngines[0]?.id ?? null;
  const activeEngine = engines.find((engine) => engine.id === activeEngineId) ?? null;

  const handleStart = async () => {
    if (!activeEngineId) return;
    setBusy(true);
    try {
      await onStartEngine(activeEngineId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper withBorder h="100%" pos="relative">
      <Tabs
        h="100%"
        orientation="vertical"
        placement="right"
        value={activeTab}
        onChange={(v) => v && setActiveTab(v)}
      >
        <Tabs.List>
          <Tabs.Tab value="engines">引擎</Tabs.Tab>
          <Tabs.Tab value="report">报告</Tabs.Tab>
          <Tabs.Tab value="logs">日志</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="engines" p="xs" h="100%">
          <ScrollArea h="100%">
            <Stack gap="xs">
              <Group align="end" gap="xs">
                <Select
                  label="分析引擎"
                  placeholder="请先在引擎页添加 Pikafish"
                  value={activeEngineId}
                  data={engines.map((engine) => ({
                    value: engine.id,
                    label: `${engine.name}${engine.enabled ? "" : "（停用）"}`,
                  }))}
                  onChange={setSelectedEngineId}
                  style={{ flex: 1 }}
                />
                <Button
                  variant="light"
                  loading={busy}
                  disabled={!activeEngine}
                  onClick={handleStart}
                >
                  开始分析
                </Button>
                <Button
                  variant="default"
                  disabled={!isEngineRunning}
                  onClick={() => void onStopEngine()}
                >
                  停止
                </Button>
              </Group>

              {/* Engine summary */}
              <Group justify="space-between">
                <Group gap="xs">
                  <Text fw="bold">{activeEngine?.name ?? "未配置引擎"}</Text>
                  {activeEngine && (
                    <Badge variant="light">
                      {activeEngine.go.type === "depth"
                        ? `${activeEngine.go.value} 层`
                        : `${activeEngine.go.value} ms`}
                    </Badge>
                  )}
                  {engineStats.status && <Badge variant="outline">{engineStats.status}</Badge>}
                </Group>
                <Group gap="lg">
                  <Stack gap={0} align="center">
                    <Text size="0.7rem" tt="uppercase" fw={700}>
                      评估
                    </Text>
                    <Text fw="bold" fz="md">
                      {engineStats.score}
                    </Text>
                  </Stack>
                  <Stack gap={0} align="center">
                    <Text size="0.7rem" tt="uppercase" fw={700}>
                      深度
                    </Text>
                    <Text fw="bold" fz="md">
                      {engineStats.depth}
                    </Text>
                  </Stack>
                  <Stack gap={0} align="center">
                    <Text size="0.7rem" tt="uppercase" fw={700}>
                      速度
                    </Text>
                    <Text fw="bold" fz="md">
                      {engineStats.knps}
                    </Text>
                  </Stack>
                </Group>
              </Group>
              <Progress value={50} animated color="blue" />
              {engineStats.bestmove && engineStats.bestmove !== "-" && (
                <Text size="sm" c="dimmed">
                  Bestmove: <Code>{engineStats.bestmove}</Code>
                </Text>
              )}

              {/* PV Lines */}
              <Accordion variant="separated" multiple defaultValue={["pv1"]}>
                {pvLines.slice(0, 3).map((line, i) => (
                  <Accordion.Item key={i} value={`pv${i}`}>
                    <Accordion.Control>
                      <Group>
                        <Code>{line.score}</Code>
                        <Text size="sm" lineClamp={1}>
                          {line.moves.join(" ")}
                        </Text>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Text size="sm" style={{ fontFamily: "monospace" }}>
                        {line.moves.join(" ")}
                      </Text>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Stack>
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel value="report" p="xs">
          <Stack gap="xs">
            <Text fw="bold">评估走势</Text>
            <EvalChart root={root} position={position} onNavigate={onNavigate} />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="logs" p="xs">
          <ScrollArea h="100%">
            <Text
              component="pre"
              size="xs"
              style={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
            >
              {engineOutput || "暂无日志"}
            </Text>
          </ScrollArea>
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

interface PVLine {
  score: string;
  moves: string[];
}

function parsePvLines(output: string): PVLine[] {
  const lines: PVLine[] = [];
  const infoLines = output.split("\n").filter((l) => l.includes("info"));

  for (const line of infoLines.slice(-3)) {
    const scoreMatch = line.match(/score (?:cp|mate) (-?\d+)/);
    const pvMatch = line.match(/pv ([a-h][0-9][a-h][0-9\s]+)/);

    if (scoreMatch && pvMatch) {
      const score = scoreMatch[1];
      const moves = pvMatch[1].trim().split(/\s+/).filter(Boolean);
      lines.push({ score: `${parseInt(score) > 0 ? "+" : ""}${(parseInt(score) / 100).toFixed(2)}`, moves });
    }
  }

  return lines.length > 0 ? lines : [{ score: "0.00", moves: ["暂无分析线"] }];
}
