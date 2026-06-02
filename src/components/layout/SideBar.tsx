import { ActionIcon, Stack, Tooltip } from "@mantine/core";
import {
  IconChess,
  IconDatabase,
  IconEngine,
  IconSettings,
} from "@tabler/icons-react";

type Page = "boards" | "databases" | "engines" | "settings";

interface SideBarProps {
  active: Page;
  onChange: (page: Page) => void;
}

export default function SideBar({ active, onChange }: SideBarProps) {
  const items: { page: Page; icon: typeof IconChess; label: string }[] = [
    { page: "boards", icon: IconChess, label: "棋盘" },
    { page: "databases", icon: IconDatabase, label: "数据库" },
    { page: "engines", icon: IconEngine, label: "引擎" },
    { page: "settings", icon: IconSettings, label: "设置" },
  ];

  return (
    <Stack gap={4} align="center" pt="xs">
      {items.map(({ page, icon: Icon, label }) => (
        <Tooltip key={page} label={label} position="right">
          <ActionIcon
            size="lg"
            variant={active === page ? "light" : "transparent"}
            color={active === page ? "blue" : "gray"}
            onClick={() => onChange(page)}
            style={{ borderRadius: "var(--mantine-radius-sm)" }}
          >
            <Icon size={20} />
          </ActionIcon>
        </Tooltip>
      ))}
    </Stack>
  );
}
