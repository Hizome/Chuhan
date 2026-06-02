import {
  Button,
  Card,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  UnstyledButton,
  Badge,
} from "@mantine/core";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import {
  IconBrain,
  IconClock,
  IconDeviceGamepad2,
  IconFileImport,
  IconRobot,
  IconTargetArrow,
} from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  tabsAtom,
  activeTabAtom,
  recentFilesAtom,
  type RecentFile,
} from "../../state/uiStore";
import { parseUBB } from "../../utils/ubbParser";
import type { TreeState } from "../../types/xiangqi";

interface NewTabHomeProps {
  tabId: string;
  onStartAnalysis: (tree: TreeState) => void;
}

function RecentFileRow({
  file,
  onOpen,
}: {
  file: RecentFile;
  onOpen: (file: RecentFile) => void;
}) {
  return (
    <UnstyledButton
      onClick={() => onOpen(file)}
      px="sm"
      py={6}
      style={{
        borderRadius: "var(--mantine-radius-sm)",
      }}
      className="recent-file-row"
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="sm" truncate fw={500}>
            {file.name}
          </Text>
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">
            {new Date(file.lastOpened).toLocaleDateString()}
          </Text>
        </Group>
      </Group>
    </UnstyledButton>
  );
}

export default function NewTabHome({ tabId, onStartAnalysis }: NewTabHomeProps) {
  const [tabs, setTabs] = useAtom(tabsAtom);
  const setActiveTab = useSetAtom(activeTabAtom);
  const [recentFiles, setRecentFiles] = useAtom(recentFilesAtom);
  const [error, setError] = useState<string | null>(null);

  const convertTab = useCallback(
    (type: "analysis" | "play", name: string) => {
      setTabs((prev) =>
        prev.map((t) =>
          t.value === tabId ? { ...t, type, name } : t
        )
      );
    },
    [setTabs, tabId]
  );

  const handleOpenFile = useCallback(async () => {
    try {
      setError(null);
      const selected = await open({
        multiple: false,
        filters: [
          { name: "UBB", extensions: ["ubb"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (!selected) return;
      const path = typeof selected === "string" ? selected : selected.path;
      const content = await readTextFile(path);
      const tree = parseUBB(content);
      if (!tree) {
        setError("无法解析棋谱文件");
        return;
      }

      const fileName = path.split(/[/\\]/).pop() || "棋谱";
      const newRecent: RecentFile = {
        name: fileName,
        path,
        lastOpened: Date.now(),
      };
      setRecentFiles((prev) => {
        const filtered = prev.filter((f) => f.path !== path);
        return [newRecent, ...filtered].slice(0, 20);
      });

      convertTab("analysis", fileName);
      onStartAnalysis(tree);
    } catch (e) {
      setError(`打开文件失败: ${e}`);
    }
  }, [convertTab, onStartAnalysis, setRecentFiles]);

  const handleOpenRecent = useCallback(
    async (file: RecentFile) => {
      try {
        setError(null);
        const content = await readTextFile(file.path);
        const tree = parseUBB(content);
        if (!tree) {
          setError("无法解析棋谱文件");
          return;
        }
        setRecentFiles((prev) => {
          const filtered = prev.filter((f) => f.path !== file.path);
          const updated = {
            ...file,
            lastOpened: Date.now(),
          };
          return [updated, ...filtered].slice(0, 20);
        });
        convertTab("analysis", file.name);
        onStartAnalysis(tree);
      } catch (e) {
        setError(`打开文件失败: ${e}`);
      }
    },
    [convertTab, onStartAnalysis, setRecentFiles]
  );

  const cards = [
    {
      icon: <IconBrain size={48} />,
      title: "分析模式",
      description: "自由摆棋、引擎分析、研究变例",
      label: "开始分析",
      onClick: () => convertTab("analysis", "新对局"),
    },
    {
      icon: <IconRobot size={48} />,
      title: "人机对战",
      description: "与象棋引擎进行对弈",
      label: "开始对弈",
      onClick: () => convertTab("play", "人机对战"),
    },
    {
      icon: <IconFileImport size={48} />,
      title: "打开棋谱",
      description: "导入 UBB 格式的棋谱文件",
      label: "选择文件",
      onClick: handleOpenFile,
    },
    {
      icon: <IconTargetArrow size={48} />,
      title: "新对局",
      description: "从零开始一盘新棋",
      label: "新建对局",
      onClick: () => convertTab("analysis", "新对局"),
    },
  ];

  return (
    <Stack gap="lg" pt="sm" px="md" h="100%" style={{ overflow: "auto" }}>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        {cards.map((card) => (
          <Card
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            key={card.title}
            style={{ transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
            className="home-card"
          >
            <Stack align="center" h="100%" justify="space-between">
              <Text c="dimmed">{card.icon}</Text>

              <div style={{ textAlign: "center" }}>
                <Text fw={500}>{card.title}</Text>
                <Text size="sm" c="dimmed" mt={4}>
                  {card.description}
                </Text>
              </div>

              <Button
                variant="light"
                fullWidth
                mt="md"
                radius="md"
                onClick={card.onClick}
              >
                {card.label}
              </Button>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>

      {error && (
        <Text c="red" size="sm" ta="center">
          {error}
        </Text>
      )}

      <Card shadow="sm" p="md" radius="md" withBorder>
        <Group justify="space-between" mb="xs">
          <Text fw={600} size="lg">
            最近文件
          </Text>
          {recentFiles.length > 0 && (
            <Badge size="sm" variant="light" color="gray">
              {recentFiles.length}
            </Badge>
          )}
        </Group>
        {recentFiles.length === 0 ? (
          <Stack align="center" justify="center" h={120} gap="xs">
            <IconClock size={36} style={{ opacity: 0.3 }} />
            <Text c="dimmed" size="sm">
              暂无最近文件
            </Text>
          </Stack>
        ) : (
          <ScrollArea.Autosize mah={280}>
            <Stack gap={2}>
              {recentFiles.map((file) => (
                <RecentFileRow
                  key={file.path}
                  file={file}
                  onOpen={handleOpenRecent}
                />
              ))}
            </Stack>
          </ScrollArea.Autosize>
        )}
      </Card>
    </Stack>
  );
}
