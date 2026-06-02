import { Portal, Stack, Group } from "@mantine/core";
import Board from "../Board";
import MoveList from "../MoveList";
import CommentBox from "../CommentBox";
import GameInfo from "../GameInfo";
import EvalBar from "./EvalBar";
import AnalysisPanel from "../panels/analysis/AnalysisPanel";
import { createTreeStore } from "../../state/treeStore";
import { useEngine } from "../../hooks/useEngine";
import { useMemo } from "react";

interface BoardAnalysisProps {
  tabId: string;
}

export default function BoardAnalysis({ tabId }: BoardAnalysisProps) {
  const store = useMemo(() => createTreeStore(), [tabId]);
  const engine = useEngine(`engine-${tabId}`);

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
  } = store();

  const node = currentNode();
  const fen = node.fen;
  const lastMove = node.move
    ? { from: node.move.from, to: node.move.to }
    : null;

  const score = node.score ?? 0;

  const handleBoardMove = (move: { from: string; to: string; capture?: boolean }, newFen: string) => {
    const san = `${move.from}-${move.to}`;
    makeMove(move, san, newFen);
  };

  return (
    <>
      {/* Left: Board + EvalBar */}
      <Portal target="#left" style={{ height: "100%" }}>
        <Group h="100%" gap="xs" p="xs" wrap="nowrap">
          <EvalBar score={score} orientation="red" />
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <Board
              fen={fen}
              onMove={handleBoardMove}
              lastMove={lastMove}
            />
          </div>
        </Group>
      </Portal>

      {/* TopRight: Analysis Panels */}
      <Portal target="#topRight" style={{ height: "100%" }}>
        <AnalysisPanel
          root={root}
          position={position}
          onNavigate={goToPath}
          engineOutput={engine.output}
          engineStats={engine.stats}
        />
      </Portal>

      {/* BottomRight: Notation & Controls */}
      <Portal target="#bottomRight" style={{ height: "100%" }}>
        <Stack h="100%" gap="xs" p="xs">
          <GameInfo headers={headers} onChange={setHeaders} />
          <MoveList
            root={root}
            position={position}
            onSelectPath={goToPath}
          />
          <Stack gap="xs">
            <CommentBox comment={node.comment} onChange={setComment} />
            <Group gap="xs" justify="center">
              <button onClick={goToFirst}>|&lt;</button>
              <button onClick={goToPrev}>&lt;</button>
              <button onClick={deleteMove}>删除</button>
              <button onClick={goToNext}>&gt;</button>
              <button onClick={goToLast}>&gt;|</button>
            </Group>
          </Stack>
        </Stack>
      </Portal>
    </>
  );
}
