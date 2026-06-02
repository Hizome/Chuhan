import { useCallback, useMemo, useState } from "react";
import {
  AppShell,
  Burger,
  Group,
  Title,
  Button,
  Grid,
  Stack,
  Text,
  Flex,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import Board from "./components/Board";
import MoveList from "./components/MoveList";
import EnginePanel from "./components/EnginePanel";
import CommentBox from "./components/CommentBox";
import GameInfo from "./components/GameInfo";
import { createTreeStore, getNodeAtPath } from "./state/treeStore";
import { parseUBB, treeToUBB } from "./utils/ubbParser";
import type { Move } from "./types/xiangqi";
import { useSound } from "./hooks/useSound";

function App() {
  const [opened, { toggle }] = useDisclosure();
  const [enginePanelOpen, setEnginePanelOpen] = useState(false);
  const [pieceTheme, setPieceTheme] = useState<string | undefined>(undefined);
  const { play } = useSound();

  // Create tree store instance (similar to En Croissant's per-tab store)
  const store = useMemo(() => createTreeStore(), []);
  const {
    root,
    headers,
    position,
    currentNode,
    goToNext,
    goToPrev,
    goToFirst,
    goToLast,
    goToPath,
    makeMove,
    deleteMove,
    setComment,
    setHeaders,
    loadTree,
    resetTree,
  } = store();

  const node = currentNode();
  const fen = node.fen;
  const lastMove = node.move
    ? { from: node.move.from, to: node.move.to }
    : null;

  const handleBoardMove = useCallback(
    (move: Move, newFen: string) => {
      const san = `${move.from}-${move.to}`;
      makeMove(move, san, newFen);
      play(move.capture ? "capture" : "move");
    },
    [makeMove, play]
  );

  const handleOpenFile = async () => {
    const path = await open({
      title: "打开 UBB 棋谱",
      filters: [{ name: "UBB 棋谱", extensions: ["ubb", "txt"] }],
    });
    if (path) {
      const content = await readTextFile(path);
      const tree = parseUBB(content);
      loadTree(tree);
    }
  };

  const handleSaveFile = async () => {
    const path = await save({
      title: "保存 UBB 棋谱",
      filters: [{ name: "UBB 棋谱", extensions: ["ubb", "txt"] }],
      defaultPath: "game.ubb",
    });
    if (path) {
      const ubb = treeToUBB({ root, headers, position, dirty: false });
      await writeTextFile(path, ubb);
    }
  };

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Title order={4}>CCBridge Arena</Title>
          </Group>
          <Group gap="xs">
            <Button size="compact-sm" variant="light" onClick={resetTree}>
              新对局
            </Button>
            <Button size="compact-sm" variant="light" onClick={handleOpenFile}>
              打开
            </Button>
            <Button size="compact-sm" variant="light" onClick={handleSaveFile}>
              保存
            </Button>
            <Button
              size="compact-sm"
              variant="light"
              onClick={() => setEnginePanelOpen((v) => !v)}
            >
              {enginePanelOpen ? "隐藏引擎" : "引擎"}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="md" style={{ height: "100%" }}>
          <GameInfo headers={headers} onChange={setHeaders} />
          <MoveList
            root={root}
            position={position}
            onSelectPath={goToPath}
          />
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Grid gutter="md" style={{ height: "calc(100vh - 80px)" }}>
          <Grid.Col span={enginePanelOpen ? 4 : 6}>
            <Stack gap="md" style={{ height: "100%" }}>
              <Flex justify="center">
                <Board
                  fen={fen}
                  onMove={handleBoardMove}
                  lastMove={lastMove}
                  pieceTheme={pieceTheme}
                />
              </Flex>
              <Group justify="center" gap="xs">
                <Button size="compact-sm" onClick={goToFirst}>
                  |&lt;
                </Button>
                <Button size="compact-sm" onClick={goToPrev}>
                  &lt;
                </Button>
                <Button size="compact-sm" color="red" onClick={deleteMove}>
                  删除
                </Button>
                <Button size="compact-sm" onClick={goToNext}>
                  &gt;
                </Button>
                <Button size="compact-sm" onClick={goToLast}>
                  &gt;|
                </Button>
                <Button
                  size="compact-sm"
                  variant="light"
                  onClick={() =>
                    setPieceTheme((prev) =>
                      prev
                        ? undefined
                        : "/libs/xiangqiboardjs-0.3.3/img/xiangqipieces/graphic/{piece}.png"
                    )
                  }
                >
                  换棋子
                </Button>
              </Group>
            </Stack>
          </Grid.Col>

          <Grid.Col span={enginePanelOpen ? 4 : 3}>
            <Stack gap="md" style={{ height: "100%" }}>
              <CommentBox
                comment={node.comment}
                onChange={setComment}
              />
            </Stack>
          </Grid.Col>

          {enginePanelOpen && (
            <Grid.Col span={4}>
              <EnginePanel
                engineId="engine1"
                title="引擎 1"
              />
            </Grid.Col>
          )}
        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
