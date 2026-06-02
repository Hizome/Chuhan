import { useMemo } from "react";
import { Paper, Stack, Text, Button, ScrollArea } from "@mantine/core";
import type { TreeNode } from "../types/xiangqi";

interface MoveListProps {
  root: TreeNode;
  position: number[];
  onSelectPath: (path: number[]) => void;
}

function buildMainline(node: TreeNode): { node: TreeNode; path: number[] }[] {
  const result: { node: TreeNode; path: number[] }[] = [];
  let current = node;
  const path: number[] = [];

  while (current.children[0]) {
    path.push(0);
    current = current.children[0];
    result.push({ node: current, path: [...path] });
  }

  return result;
}

export default function MoveList({ root, position, onSelectPath }: MoveListProps) {
  const mainline = useMemo(() => buildMainline(root), [root]);

  const isActive = (path: number[]): boolean => {
    if (path.length !== position.length) return false;
    return path.every((p, i) => p === position[i]);
  };

  return (
    <Paper withBorder p="xs" style={{ height: "100%" }}>
      <Text fw={700} mb="xs" size="sm">
        着法列表
      </Text>
      <ScrollArea style={{ height: "calc(100% - 28px)" }}>
        <Stack gap={2}>
          <Button
            variant={position.length === 0 ? "filled" : "light"}
            size="compact-xs"
            fullWidth
            onClick={() => onSelectPath([])}
          >
            初始局面
          </Button>
          {mainline.map(({ node, path }, index) => {
            const moveNumber = Math.floor(index / 2) + 1;
            const isWhite = index % 2 === 0;
            const prefix = isWhite ? `${moveNumber}. ` : "";
            return (
              <Button
                key={path.join(",")}
                variant={isActive(path) ? "filled" : "light"}
                size="compact-xs"
                fullWidth
                onClick={() => onSelectPath(path)}
                styles={{
                  inner: { justifyContent: "flex-start" },
                }}
              >
                {prefix}
                {node.san || `${node.move?.from}-${node.move?.to}`}
              </Button>
            );
          })}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}
