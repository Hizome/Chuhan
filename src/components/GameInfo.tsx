import { useState } from "react";
import { Paper, TextInput, Button, Stack, Text, Group } from "@mantine/core";
import type { GameHeaders } from "../types/xiangqi";

interface GameInfoProps {
  headers: GameHeaders;
  onChange: (headers: Partial<GameHeaders>) => void;
}

export default function GameInfo({ headers, onChange }: GameInfoProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(headers);

  const handleSave = () => {
    onChange(local);
    setEditing(false);
  };

  if (!editing) {
    return (
      <Paper withBorder p="xs">
        <Stack gap={4}>
          <Group justify="space-between">
            <Text fw={700} size="sm">
              对局信息
            </Text>
            <Button size="compact-xs" variant="light" onClick={() => setEditing(true)}>
              编辑
            </Button>
          </Group>
          {headers.title && <Text size="xs">标题: {headers.title}</Text>}
          {headers.red && <Text size="xs">红方: {headers.red}</Text>}
          {headers.black && <Text size="xs">黑方: {headers.black}</Text>}
          {headers.date && <Text size="xs">日期: {headers.date}</Text>}
          {headers.result && <Text size="xs">结果: {headers.result}</Text>}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="xs">
      <Stack gap="xs">
        <Text fw={700} size="sm">
          编辑对局信息
        </Text>
        <TextInput
          size="xs"
          label="标题"
          value={local.title || ""}
          onChange={(e) => setLocal({ ...local, title: e.currentTarget.value })}
        />
        <TextInput
          size="xs"
          label="红方"
          value={local.red || ""}
          onChange={(e) => setLocal({ ...local, red: e.currentTarget.value })}
        />
        <TextInput
          size="xs"
          label="黑方"
          value={local.black || ""}
          onChange={(e) => setLocal({ ...local, black: e.currentTarget.value })}
        />
        <TextInput
          size="xs"
          label="日期"
          value={local.date || ""}
          onChange={(e) => setLocal({ ...local, date: e.currentTarget.value })}
        />
        <TextInput
          size="xs"
          label="结果"
          value={local.result || ""}
          onChange={(e) => setLocal({ ...local, result: e.currentTarget.value })}
        />
        <Group gap="xs">
          <Button size="compact-sm" onClick={handleSave}>
            保存
          </Button>
          <Button size="compact-sm" variant="light" onClick={() => setEditing(false)}>
            取消
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
