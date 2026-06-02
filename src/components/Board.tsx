import { useEffect, useRef, useCallback } from "react";
import type { Move } from "../types/xiangqi";

declare global {
  interface Window {
    Xiangqiboard: (elementId: string, config: Record<string, unknown>) => XiangqiboardApi;
    Engine: new () => WukongEngine;
  }
}

interface XiangqiboardApi {
  position: (fen?: string) => string | void;
  flip: () => void;
  destroy: () => void;
}

interface WukongEngine {
  START_FEN: string;
  setBoard: (fen: string) => void;
  generateFen: () => string;
  generateLegalMoves: () => { move: number }[];
  moveFromString: (move: string) => number;
  makeMove: (move: number) => void;
  getSide: () => number;
  getCaptureFlag: (move: number) => boolean;
  getSourceSquare: (move: number) => number;
  getTargetSquare: (move: number) => number;
  getPiece: (square: number) => number;
  squareToString: (square: number) => string;
}

interface BoardProps {
  fen: string;
  onMove: (move: Move, newFen: string) => void;
  boardId: string;
  orientation?: "red" | "black";
  draggable?: boolean;
  pieceTheme?: string | ((piece: string) => string);
  boardTheme?: string;
  highlightSquares?: string[];
  lastMove?: { from: string; to: string } | null;
}

const DEFAULT_PIECE_THEME = "/assets/pieces/{piece}.png";
const DEFAULT_BOARD_THEME = "/assets/boards/board-red.png";

export default function Board({
  fen,
  onMove,
  boardId,
  orientation = "red",
  draggable = true,
  pieceTheme = DEFAULT_PIECE_THEME,
  boardTheme = DEFAULT_BOARD_THEME,
  highlightSquares = [],
  lastMove,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const boardApi = useRef<XiangqiboardApi | null>(null);
  const engineRef = useRef<WukongEngine | null>(null);

  // Initialize engine instance
  useEffect(() => {
    engineRef.current = new window.Engine();
    engineRef.current.setBoard(fen);
    return () => {
      engineRef.current = null;
    };
  }, []);

  // Initialize board
  useEffect(() => {
    if (!boardRef.current) return;

    const config: Record<string, unknown> = {
      draggable,
      position: fen,
      orientation: orientation === "red" ? "red" : "black",
      sparePieces: false,
      showNotation: false,
      moveSpeed: 100,
      snapbackSpeed: 100,
      snapSpeed: 50,
      appearSpeed: 100,
      onDragStart: (source: string) => {
        if (!engineRef.current) return false;
        highlightLegalMoves(source);
        return true;
      },
      onDrop: (source: string, target: string) => {
        clearHighlights();
        const result = handleMove(source, target);
        return result;
      },
      onSnapEnd: (source: string, target: string) => {
        if (boardApi.current && engineRef.current) {
          const newFen = engineRef.current.generateFen();
          boardApi.current.position(newFen);
        }
      },
    };

    config.pieceTheme = pieceTheme;
    config.boardTheme = boardTheme;

    // Delay initialization to ensure container has correct size
    let rafId = 0;
    const initBoard = () => {
      if (boardRef.current) {
        boardApi.current = window.Xiangqiboard(boardId, config);
      }
    };
    rafId = requestAnimationFrame(initBoard);

    return () => {
      cancelAnimationFrame(rafId);
      boardApi.current?.destroy();
      boardApi.current = null;
    };
  }, []);

  // Update position when fen changes externally
  useEffect(() => {
    if (boardApi.current) {
      boardApi.current.position(fen);
    }
    if (engineRef.current) {
      engineRef.current.setBoard(fen);
    }
  }, [fen]);

  // Update last move highlight
  useEffect(() => {
    clearHighlights();
    if (lastMove) {
      const toEl = document.querySelector(`.square-${lastMove.to}`);
      if (toEl) toEl.classList.add("highlight");
    }
    highlightSquares.forEach((sq) => {
      const el = document.querySelector(`.square-${sq}`);
      if (el) el.classList.add("legalmove");
    });
  }, [lastMove, highlightSquares]);

  const handleMove = useCallback(
    (source: string, target: string): "snapback" | void => {
      if (!engineRef.current) return "snapback";

      const moveStr = source + target;
      const validMove = engineRef.current.moveFromString(moveStr);
      if (validMove === 0) return "snapback";

      const legalMoves = engineRef.current.generateLegalMoves();
      const isLegal = legalMoves.some((m) => m.move === validMove);
      if (!isLegal) return "snapback";

      engineRef.current.makeMove(validMove);

      const newFen = engineRef.current.generateFen();
      const move: Move = {
        from: source,
        to: target,
        capture: engineRef.current.getCaptureFlag(validMove),
      };

      onMove(move, newFen);
      return undefined;
    },
    [onMove]
  );

  const highlightLegalMoves = useCallback((sourceSquare: string) => {
    if (!engineRef.current) return;
    const legalMoves = engineRef.current.generateLegalMoves();

    for (const lm of legalMoves) {
      const source = engineRef.current.squareToString(
        engineRef.current.getSourceSquare(lm.move)
      );
      const target = engineRef.current.squareToString(
        engineRef.current.getTargetSquare(lm.move)
      );

      if (source === sourceSquare) {
        const el = document.querySelector(`.square-${target}`);
        if (el) {
          el.classList.add("legalmove");
          if (engineRef.current.getPiece(engineRef.current.getTargetSquare(lm.move))) {
            el.classList.add("legalcapture");
          }
        }
      }
    }
  }, []);

  const clearHighlights = useCallback(() => {
    document.querySelectorAll(".square-2b8ce").forEach((el) => {
      el.classList.remove("highlight", "legalmove", "legalcapture");
    });
  }, []);

  return (
    <div
      id={boardId}
      ref={boardRef}
      style={{ width: "100%", maxWidth: 480 }}
    />
  );
}
