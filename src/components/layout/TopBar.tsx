import { Group, Title, Button } from "@mantine/core";

export default function TopBar() {
  return (
    <Group h="100%" px="md" justify="space-between" style={{ userSelect: "none" }}>
      <Group gap="xs">
        <Title order={5}>楚汉</Title>
      </Group>
      <Group gap="xs">
        <Button size="compact-xs" variant="subtle">
          文件
        </Button>
        <Button size="compact-xs" variant="subtle">
          视图
        </Button>
        <Button size="compact-xs" variant="subtle">
          帮助
        </Button>
      </Group>
    </Group>
  );
}
