import { useCallback, useEffect, useMemo } from "react";
import { ActionIcon, Group, Stack, Tooltip } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { Mosaic, type MosaicNode } from "react-mosaic-component";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconEraser,
  IconSwitchVertical,
  IconTrash,
} from "@tabler/icons-react";
import BoardV2 from "./BoardV2";
import MoveList from "../MoveList";
import GameInfo from "../GameInfo";
import AnalysisPanel from "../panels/analysis/AnalysisPanel";
import { createTreeStore } from "../../state/treeStore";
import { useEngine } from "../../hooks/useEngine";
import { useAtom } from "jotai";
import { windowsStateAtom, tabPayloadsAtom } from "../../state/uiStore";
import { enginesAtom, selectedEngineIdAtom } from "../../state/engineStore";
import type { ViewId } from "../../state/uiStore";

interface BoardAnalysisProps {
  tabId: string;
}

export default function BoardAnalysis({ tabId }: BoardAnalysisProps) {
  const store = useMemo(() => createTreeStore(tabId), [tabId]);
  const engine = useEngine(`engine-${tabId}`);
  const [windowsState, setWindowsState] = useAtom(windowsStateAtom);
  const [engines] = useAtom(enginesAtom);
  const [selectedEngineId] = useAtom(selectedEngineIdAtom);
  const isCompact = useMediaQuery("(max-width: 760px)");

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
    setShapes,
    clearShapes,
    setHeaders,
    loadTree,
  } = store();

  const node = currentNode();
  const fen = node.fen;
  const lastMove = node.move
    ? { from: node.move.from, to: node.move.to }
    : null;
  const orientation = headers.orientation ?? "red";
  const engineBestMove = engine.stats.bestmove && engine.stats.bestmove !== "-"
    ? engine.stats.bestmove
    : null;
  const engineHintShapes = engineBestMove && /^[a-i][0-9][a-i][0-9]/.test(engineBestMove)
    ? [{ orig: engineBestMove.slice(0, 2), dest: engineBestMove.slice(2, 4), brush: "blue" }]
    : [];

  const [payloads, setPayloads] = useAtom(tabPayloadsAtom);

  useEffect(() => {
    const payload = payloads[tabId];
    if (payload) {
      loadTree(payload);
      setPayloads((prev) => {
        const next = { ...prev };
        delete next[tabId];
        return next;
      });
    }
  }, []); // run once on mount

  useEffect(() => {
    setWindowsState((prev) => {
      const currentNode = prev.currentNode;
      if (
        typeof currentNode === "object" &&
        currentNode.direction === "row" &&
        currentNode.first === "left" &&
        (currentNode.splitPercentage ?? 0) < 65
      ) {
        return {
          currentNode: {
            ...currentNode,
            splitPercentage: 65,
          },
        };
      }

      return prev;
    });
  }, [setWindowsState]);

  const handleBoardMove = useCallback(
    (move: { from: string; to: string; capture?: boolean }, newFen: string) => {
      const san = `${move.from}-${move.to}`;
      makeMove(move, san, newFen);
    },
    [makeMove]
  );

  const handleMosaicChange = useCallback(
    (node: MosaicNode<ViewId> | null) => {
      if (node) setWindowsState({ currentNode: node });
    },
    [setWindowsState]
  );

  const handleStartEngine = useCallback(
    async (engineId: string) => {
      const selectedEngine = engines.find((item) => item.id === engineId);
      if (!selectedEngine) return;

      if (!engine.isRunning) {
        await engine.spawn(selectedEngine.path);
        await engine.sendCommand(selectedEngine.protocol === "ucci" ? "ucci" : "uci");
        for (const [name, value] of Object.entries(selectedEngine.settings)) {
          if (value === null || value === "") continue;
          await engine.sendCommand(`setoption name ${name} value ${value}`);
        }
        await engine.sendCommand("isready");
        await engine.sendCommand("ucinewgame");
      } else {
        await engine.sendCommand("stop");
      }

      await engine.sendCommand(`position fen ${fen}`);
      if (selectedEngine.go.type === "movetime") {
        await engine.sendCommand(`go movetime ${selectedEngine.go.value}`);
      } else {
        await engine.sendCommand(`go depth ${selectedEngine.go.value}`);
      }
    },
    [engine, engines, fen]
  );

  const handleStopEngine = useCallback(async () => {
    if (engine.isRunning) {
      await engine.sendCommand("stop");
    }
  }, [engine]);

  const toggleOrientation = useCallback(() => {
    setHeaders({ orientation: orientation === "red" ? "black" : "red" });
  }, [orientation, setHeaders]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        toggleOrientation();
      }
      if (event.key.toLowerCase() === "l" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        clearShapes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearShapes, toggleOrientation]);

  const analysisPanel = (
    <AnalysisPanel
      root={root}
      position={position}
      onNavigate={goToPath}
      engineOutput={engine.output}
      engineStats={engine.stats}
      isEngineRunning={engine.isRunning}
      selectedEngineId={selectedEngineId}
      onStartEngine={handleStartEngine}
      onStopEngine={handleStopEngine}
    />
  );

  const bottomPanel = (
    <Stack h="100%" gap="xs" className="board-analysis-bottom-panel">
      <GameInfo headers={headers} onChange={setHeaders} />
      <div className="board-analysis-move-list">
        <MoveList
          root={root}
          position={position}
          onSelectPath={goToPath}
        />
      </div>
      <Group grow gap="xs" className="board-analysis-move-controls">
        <Tooltip label="回到开始">
          <ActionIcon variant="default" size="lg" aria-label="回到开始" onClick={goToFirst}>
            <IconChevronsLeft size="1.2rem" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="上一着">
          <ActionIcon variant="default" size="lg" aria-label="上一着" onClick={goToPrev}>
            <IconChevronLeft size="1.2rem" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="下一着">
          <ActionIcon variant="default" size="lg" aria-label="下一着" onClick={goToNext}>
            <IconChevronRight size="1.2rem" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="到最后">
          <ActionIcon variant="default" size="lg" aria-label="到最后" onClick={goToLast}>
            <IconChevronsRight size="1.2rem" />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="删除当前着法">
          <ActionIcon
            variant="subtle"
            color="red"
            size="lg"
            aria-label="删除当前着法"
            onClick={deleteMove}
          >
            <IconTrash size="1.1rem" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Stack>
  );

  const renderTile = useCallback(
    (id: ViewId) => {
      switch (id) {
        case "left":
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Stack gap={4} className="board-analysis-board-controls">
                <Tooltip label="清除箭头" position="right">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    aria-label="清除箭头"
                    onClick={clearShapes}
                  >
                    <IconEraser size="1.2rem" />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="反转棋盘" position="right">
                  <ActionIcon
                    variant="default"
                    size="lg"
                    aria-label="反转棋盘"
                    onClick={toggleOrientation}
                  >
                    <IconSwitchVertical size="1.2rem" />
                  </ActionIcon>
                </Tooltip>
              </Stack>
              <BoardV2
                fen={fen}
                onMove={handleBoardMove}
                lastMove={lastMove}
                orientation={orientation}
                shapes={node.shapes}
                autoShapes={engineHintShapes}
                onShapesChange={setShapes}
              />
            </div>
          );
        case "topRight":
          return (
            <div className="board-analysis-side-tile">
              {analysisPanel}
            </div>
          );
        case "bottomRight":
          return (
            <div className="board-analysis-side-tile">
              {bottomPanel}
            </div>
          );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fen, lastMove, root, headers, position, node.shapes, engine, engineHintShapes, handleBoardMove, handleStartEngine, handleStopEngine, orientation, clearShapes, setShapes, toggleOrientation]
  );

  if (isCompact) {
    return (
      <div className="board-analysis-compact">
        <div className="board-analysis-compact-board">
          <Group gap={4} className="board-analysis-compact-board-controls">
            <Tooltip label="清除箭头">
              <ActionIcon variant="default" aria-label="清除箭头" onClick={clearShapes}>
                <IconEraser size="1.1rem" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="反转棋盘">
              <ActionIcon variant="default" aria-label="反转棋盘" onClick={toggleOrientation}>
                <IconSwitchVertical size="1.1rem" />
              </ActionIcon>
            </Tooltip>
          </Group>
          <BoardV2
            fen={fen}
            onMove={handleBoardMove}
            lastMove={lastMove}
            orientation={orientation}
            shapes={node.shapes}
            autoShapes={engineHintShapes}
            onShapesChange={setShapes}
          />
        </div>
        <div className="board-analysis-compact-panels">
          <div className="board-analysis-compact-analysis">{analysisPanel}</div>
          <div className="board-analysis-compact-bottom">{bottomPanel}</div>
        </div>
      </div>
    );
  }

  return (
    <Mosaic<ViewId>
      renderTile={renderTile}
      value={windowsState.currentNode}
      onChange={handleMosaicChange}
      resize={{ minimumPaneSizePercentage: 5 }}
      className="mosaic-blueprint-theme"
    />
  );
}
