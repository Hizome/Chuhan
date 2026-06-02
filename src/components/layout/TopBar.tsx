import { Group, Title, ActionIcon } from "@mantine/core";
import { IconMenu2 } from "@tabler/icons-react";

export default function TopBar() {
  return (
    <Group h="100%" px="sm" justify="space-between" style={{ userSelect: "none" }}>
      <Group gap="xs">
        <ActionIcon size="sm" variant="transparent">
          <IconMenu2 size={16} />
        </ActionIcon>
        <Title order={6} fw={600}>楚汉</Title>
      </Group>
      <Group gap="xs">
        {/* Placeholder for future menu items */}
      </Group>
    </Group>
  );
}
