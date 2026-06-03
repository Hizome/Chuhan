import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import type { DrawShape, Move } from "../../types/xiangqi";
import { useSound } from "../../hooks/useSound";

declare global {
  interface Window {
    Engine: new () => WukongEngine;
  }
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

const PIECE_MAP: Record<string, string> = {
  K: "rK",
  A: "rA",
  B: "rB",
  N: "rN",
  R: "rR",
  C: "rC",
  P: "rP",
  k: "bK",
  a: "bA",
  b: "bB",
  n: "bN",
  r: "bR",
  c: "bC",
  p: "bP",
};

const FILES = "abcdefghi".split("");
const RANKS = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const BOARD_WIDTH = 767;
const BOARD_HEIGHT = 842;
const BOARD_GEOMETRY = {
  left: 110,
  right: 650,
  top: 96,
  bottom: 704,
};
const PIECE_SIZE = 66;
const DRAW_BRUSHES: Record<string, { color: string; opacity: number; width: number }> = {
  green: { color: "#15781b", opacity: 0.82, width: 11 },
  blue: { color: "#003088", opacity: 0.82, width: 11 },
  red: { color: "#882020", opacity: 0.82, width: 11 },
  yellow: { color: "#e68f00", opacity: 0.82, width: 11 },
  paleBlue: { color: "#4a7bd3", opacity: 0.45, width: 8 },
  paleGreen: { color: "#4f9f52", opacity: 0.45, width: 8 },
  paleRed: { color: "#c45b5b", opacity: 0.45, width: 8 },
};

function fenToPosition(fen: string): Record<string, string> {
  const pos: Record<string, string> = {};
  const rows = fen.split(" ")[0].split("/");

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const rank = RANKS[rowIdx];
    let fileIdx = 0;

    for (const char of row) {
      if (/\d/.test(char)) {
        fileIdx += parseInt(char, 10);
      } else if (PIECE_MAP[char]) {
        pos[`${FILES[fileIdx]}${rank}`] = char;
        fileIdx++;
      }
    }
  }

  return pos;
}

function squareToFileRank(square: string) {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square.slice(1));
  if (file < 0 || !Number.isInteger(rank) || rank < 0 || rank > 9) {
    return null;
  }
  return { file, rank };
}

function squareToBoardPoint(square: string, orientation: "red" | "black") {
  const parsed = squareToFileRank(square);
  if (!parsed) return null;

  const fileIndex = orientation === "red" ? parsed.file : 8 - parsed.file;
  const rankIndex = orientation === "red" ? 9 - parsed.rank : parsed.rank;
  const fileGap = (BOARD_GEOMETRY.right - BOARD_GEOMETRY.left) / 8;
  const rankGap = (BOARD_GEOMETRY.bottom - BOARD_GEOMETRY.top) / 9;

  return {
    x: BOARD_GEOMETRY.left + fileIndex * fileGap,
    y: BOARD_GEOMETRY.top + rankIndex * rankGap,
  };
}

function pointToSquare(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  orientation: "red" | "black"
) {
  const x = ((clientX - rect.left) / rect.width) * BOARD_WIDTH;
  const y = ((clientY - rect.top) / rect.height) * BOARD_HEIGHT;
  const fileGap = (BOARD_GEOMETRY.right - BOARD_GEOMETRY.left) / 8;
  const rankGap = (BOARD_GEOMETRY.bottom - BOARD_GEOMETRY.top) / 9;
  const displayFile = Math.round((x - BOARD_GEOMETRY.left) / fileGap);
  const displayRank = Math.round((y - BOARD_GEOMETRY.top) / rankGap);

  if (displayFile < 0 || displayFile > 8 || displayRank < 0 || displayRank > 9) {
    return null;
  }

  const targetX = BOARD_GEOMETRY.left + displayFile * fileGap;
  const targetY = BOARD_GEOMETRY.top + displayRank * rankGap;
  if (Math.abs(x - targetX) > fileGap * 0.58 || Math.abs(y - targetY) > rankGap * 0.58) {
    return null;
  }

  const file = orientation === "red" ? displayFile : 8 - displayFile;
  const rank = orientation === "red" ? 9 - displayRank : displayRank;
  return `${FILES[file]}${rank}`;
}

function pointerToBoardPoint(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: ((clientX - rect.left) / rect.width) * BOARD_WIDTH,
    y: ((clientY - rect.top) / rect.height) * BOARD_HEIGHT,
  };
}

function arrowHeadPoints(
  from: { x: number; y: number },
  to: { x: number; y: number },
  size: number
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 7;
  return [
    {
      x: to.x - Math.cos(angle - spread) * size,
      y: to.y - Math.sin(angle - spread) * size,
    },
    to,
    {
      x: to.x - Math.cos(angle + spread) * size,
      y: to.y - Math.sin(angle + spread) * size,
    },
  ];
}

interface BoardV2Props {
  fen: string;
  onMove: (move: Move, newFen: string) => void;
  boardId?: string;
  orientation?: "red" | "black";
  draggable?: boolean;
  pieceTheme?: string;
  boardTheme?: string;
  lastMove?: { from: string; to: string } | null;
  shapes?: DrawShape[];
  autoShapes?: DrawShape[];
  onShapesChange?: (shapes: DrawShape[]) => void;
}

export default function BoardV2({
  fen,
  onMove,
  boardId = "board-v2",
  orientation = "red",
  draggable = true,
  pieceTheme = "/assets/pieces/{piece}.png",
  boardTheme = "/assets/boards/board-red.png",
  lastMove,
  shapes = [],
  autoShapes = [],
  onShapesChange,
}: BoardV2Props) {
  const engineRef = useRef<WukongEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { play } = useSound();
  const [position, setPosition] = useState<Record<string, string>>(() => fenToPosition(fen));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<Set<string>>(new Set());
  const [legalCaptures, setLegalCaptures] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<{
    square: string;
    piece: string;
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [animatingSquare, setAnimatingSquare] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<{
    orig: string;
    x: number;
    y: number;
    brush: string;
  } | null>(null);

  useEffect(() => {
    engineRef.current = new window.Engine();
    engineRef.current.setBoard(fen);

    return () => {
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    setPosition(fenToPosition(fen));
    engineRef.current?.setBoard(fen);
    setDragging(null);
    setSelectedSquare(null);
    setLegalTargets(new Set());
    setLegalCaptures(new Set());
  }, [fen]);

  useEffect(() => {
    if (!lastMove) return;

    setAnimatingSquare(lastMove.to);
    const timer = window.setTimeout(() => setAnimatingSquare(null), 220);
    return () => window.clearTimeout(timer);
  }, [lastMove]);

  const squares = useMemo(() => {
    return RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}`));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalTargets(new Set());
    setLegalCaptures(new Set());
  }, []);

  const computeLegalMoves = useCallback((sourceSquare: string) => {
    if (!engineRef.current) return { targets: new Set<string>(), captures: new Set<string>() };

    const targets = new Set<string>();
    const captures = new Set<string>();

    for (const lm of engineRef.current.generateLegalMoves()) {
      const source = engineRef.current.squareToString(engineRef.current.getSourceSquare(lm.move));
      const targetSquare = engineRef.current.getTargetSquare(lm.move);
      const target = engineRef.current.squareToString(targetSquare);

      if (source === sourceSquare) {
        targets.add(target);
        if (engineRef.current.getPiece(targetSquare)) {
          captures.add(target);
        }
      }
    }

    return { targets, captures };
  }, []);

  const executeMove = useCallback(
    (source: string, target: string) => {
      if (!engineRef.current || source === target) return false;

      const moveNumber = engineRef.current.moveFromString(source + target);
      if (moveNumber === 0) return false;

      const isLegal = engineRef.current
        .generateLegalMoves()
        .some((legalMove) => legalMove.move === moveNumber);
      if (!isLegal) return false;

      const capture = engineRef.current.getCaptureFlag(moveNumber);
      engineRef.current.makeMove(moveNumber);
      play(capture ? "capture" : "move");
      onMove({ from: source, to: target, capture }, engineRef.current.generateFen());
      return true;
    },
    [onMove, play]
  );

  const startDrawing = useCallback(
    (e: PointerEvent<HTMLDivElement>, square: string) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      e.preventDefault();
      e.stopPropagation();
      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Some synthetic/browser automation paths do not expose pointer capture.
      }
      const point = pointerToBoardPoint(e.clientX, e.clientY, rect);
      const brush = e.altKey ? "red" : e.shiftKey ? "blue" : "green";
      setDrawing({ orig: square, x: point.x, y: point.y, brush });
      clearSelection();
    },
    [clearSelection]
  );

  const finishDrawing = useCallback(
    (clientX: number, clientY: number) => {
      if (!drawing) return false;

      const rect = containerRef.current?.getBoundingClientRect();
      const target = rect ? pointToSquare(clientX, clientY, rect, orientation) : null;
      const shape: DrawShape = target && target !== drawing.orig
        ? { orig: drawing.orig, dest: target, brush: drawing.brush }
        : { orig: drawing.orig, brush: drawing.brush };

      onShapesChange?.([shape]);
      setDrawing(null);
      return true;
    },
    [drawing, onShapesChange, orientation]
  );

  const pieceSrc = useCallback(
    (fenChar: string) => {
      const code = PIECE_MAP[fenChar];
      if (!code) return "";
      return pieceTheme.includes("{piece}") ? pieceTheme.replace("{piece}", code) : pieceTheme;
    },
    [pieceTheme]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>, square: string) => {
      if (!draggable) return;

      if (e.button === 2 || e.ctrlKey) {
        startDrawing(e, square);
        return;
      }

      if (selectedSquare && selectedSquare !== square && legalTargets.has(square)) {
        e.preventDefault();
        executeMove(selectedSquare, square);
        clearSelection();
        return;
      }

      const piece = position[square];
      if (!piece) {
        clearSelection();
        return;
      }

      e.preventDefault();

      const point = squareToBoardPoint(square, orientation);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!point || !rect) return;

      try {
        containerRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Some synthetic/browser automation paths do not expose pointer capture.
      }
      const pieceSizePx = rect.width * (PIECE_SIZE / BOARD_WIDTH);
      const pieceLeft = rect.left + (point.x / BOARD_WIDTH) * rect.width - pieceSizePx / 2;
      const pieceTop = rect.top + (point.y / BOARD_HEIGHT) * rect.height - pieceSizePx / 2;
      const { targets, captures } = computeLegalMoves(square);

      play("select");
      setSelectedSquare(square);
      setLegalTargets(targets);
      setLegalCaptures(captures);
      setDragging({
        square,
        piece,
        x: e.clientX,
        y: e.clientY,
        offsetX: e.clientX - pieceLeft,
        offsetY: e.clientY - pieceTop,
      });
    },
    [
      clearSelection,
      computeLegalMoves,
      draggable,
      executeMove,
      legalTargets,
      orientation,
      play,
      position,
      selectedSquare,
      startDrawing,
    ]
  );

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging) return;

      const rect = containerRef.current?.getBoundingClientRect();
      const target = rect ? pointToSquare(clientX, clientY, rect, orientation) : null;
      const moved = target && target !== dragging.square && legalTargets.has(target);

      if (moved) {
        executeMove(dragging.square, target);
        clearSelection();
      }

      setDragging(null);
    },
    [clearSelection, dragging, executeMove, legalTargets, orientation]
  );

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (drawing) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = pointerToBoardPoint(e.clientX, e.clientY, rect);
      setDrawing((prev) => (prev ? { ...prev, x: point.x, y: point.y } : null));
      return;
    }
    setDragging((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  }, [drawing]);

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (finishDrawing(e.clientX, e.clientY)) return;
      finishDrag(e.clientX, e.clientY);
    },
    [finishDrag, finishDrawing]
  );

  const handlePointerCancel = useCallback(() => {
    setDragging(null);
    setDrawing(null);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      setDragging((prev) => (prev ? { ...prev, x: event.clientX, y: event.clientY } : null));
    };
    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      finishDrag(event.clientX, event.clientY);
    };
    const handleWindowPointerCancel = () => {
      setDragging(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);
    window.addEventListener("blur", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
      window.removeEventListener("blur", handleWindowPointerCancel);
    };
  }, [dragging, finishDrag]);

  useEffect(() => {
    if (!drawing) return;

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = pointerToBoardPoint(event.clientX, event.clientY, rect);
      setDrawing((prev) => (prev ? { ...prev, x: point.x, y: point.y } : null));
    };
    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      finishDrawing(event.clientX, event.clientY);
    };
    const handleWindowPointerCancel = () => {
      setDrawing(null);
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerCancel);
    window.addEventListener("blur", handleWindowPointerCancel);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
      window.removeEventListener("blur", handleWindowPointerCancel);
    };
  }, [drawing, finishDrawing]);

  const handleSquareClick = useCallback(
    (e: MouseEvent<HTMLDivElement>, square: string) => {
      if (!selectedSquare || selectedSquare === square || !legalTargets.has(square)) return;

      e.preventDefault();
      executeMove(selectedSquare, square);
      clearSelection();
    },
    [clearSelection, executeMove, legalTargets, selectedSquare]
  );

  const renderPointStyle = (square: string) => {
    const point = squareToBoardPoint(square, orientation);
    if (!point) return undefined;

    return {
      left: `${(point.x / BOARD_WIDTH) * 100}%`,
      top: `${(point.y / BOARD_HEIGHT) * 100}%`,
    };
  };

  const renderShapes = [...autoShapes, ...shapes];

  return (
    <div
      id={boardId}
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 620,
        aspectRatio: `${BOARD_WIDTH} / ${BOARD_HEIGHT}`,
        backgroundImage: `url("${boardTheme}")`,
        backgroundSize: "100% 100%",
        backgroundPosition: "center",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg
        viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        {renderShapes.map((shape, index) => {
          const from = squareToBoardPoint(shape.orig, orientation);
          const brush = DRAW_BRUSHES[shape.brush] ?? DRAW_BRUSHES.green;
          if (!from) return null;

          if (!shape.dest) {
            return (
              <circle
                key={`${shape.orig}-${shape.brush}-${index}`}
                cx={from.x}
                cy={from.y}
                r={30}
                fill="none"
                stroke={brush.color}
                strokeWidth={brush.width}
                opacity={brush.opacity}
              />
            );
          }

          const to = squareToBoardPoint(shape.dest, orientation);
          if (!to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy);
          const pad = 30;
          const end = length > pad
            ? { x: to.x - (dx / length) * pad, y: to.y - (dy / length) * pad }
            : to;
          const head = arrowHeadPoints(from, end, 34);
          return (
            <g key={`${shape.orig}-${shape.dest}-${shape.brush}-${index}`} opacity={brush.opacity}>
              <line
                x1={from.x}
                y1={from.y}
                x2={end.x}
                y2={end.y}
                stroke={brush.color}
                strokeWidth={brush.width}
                strokeLinecap="round"
              />
              <polyline
                points={head.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke={brush.color}
                strokeWidth={brush.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
        {drawing && (() => {
          const from = squareToBoardPoint(drawing.orig, orientation);
          if (!from) return null;
          const brush = DRAW_BRUSHES[drawing.brush] ?? DRAW_BRUSHES.green;
          const head = arrowHeadPoints(from, drawing, 30);
          return (
            <g opacity={0.55}>
              <line
                x1={from.x}
                y1={from.y}
                x2={drawing.x}
                y2={drawing.y}
                stroke={brush.color}
                strokeWidth={brush.width}
                strokeLinecap="round"
              />
              <polyline
                points={head.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke={brush.color}
                strokeWidth={brush.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })()}
      </svg>

      {squares.map((square) => {
        const piece = position[square];
        const isSelected = selectedSquare === square;
        const isLegalTarget = legalTargets.has(square);
        const isLegalCapture = legalCaptures.has(square);
        const isLastMove = lastMove?.from === square || lastMove?.to === square;
        const pointStyle = renderPointStyle(square);

        if (!pointStyle) return null;

        return (
          <div
            key={square}
            data-square={square}
            onPointerDown={(e) => handlePointerDown(e, square)}
            onClick={(e) => handleSquareClick(e, square)}
            style={{
              ...pointStyle,
              position: "absolute",
              width: `${(PIECE_SIZE / BOARD_WIDTH) * 100}%`,
              aspectRatio: "1",
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
            }}
          >
            {isSelected && (
              <div
                style={{
                  position: "absolute",
                  inset: "4%",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(250, 250, 210, 0.82) 0 54%, rgba(250, 250, 210, 0.28) 72%, transparent 100%)",
                  filter: "blur(2px)",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              />
            )}
            {isLastMove && !isSelected && (
              <div
                style={{
                  position: "absolute",
                  inset: "24%",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(255,255,255,0.9) 0 38%, transparent 42% 72%, rgba(255,255,255,0.85) 78% 100%)",
                  filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.3))",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            )}
            {isLegalTarget && !isLegalCapture && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(rgba(0, 0, 0, 0.3) 25%, rgba(0, 0, 0, 0) 0)",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            )}
            {isLegalCapture && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "5px solid rgba(0, 0, 0, 0.3)",
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              />
            )}
            {piece && (!dragging || dragging.square !== square) && (
              <img
                src={pieceSrc(piece)}
                alt={piece}
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  cursor: draggable ? "grab" : "default",
                  pointerEvents: "none",
                  zIndex: 2,
                  transition:
                    animatingSquare === square
                      ? "transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                      : "none",
                  transform: animatingSquare === square ? "scale(1.05)" : "scale(1)",
                }}
              />
            )}
          </div>
        );
      })}

      {dragging && containerRef.current && (
        <img
          src={pieceSrc(dragging.piece)}
          alt={dragging.piece}
          draggable={false}
          style={{
            position: "fixed",
            left: dragging.x - dragging.offsetX,
            top: dragging.y - dragging.offsetY,
            width: containerRef.current.getBoundingClientRect().width * (PIECE_SIZE / BOARD_WIDTH),
            aspectRatio: "1",
            objectFit: "contain",
            pointerEvents: "none",
            zIndex: 1000,
            opacity: 0.9,
            filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
          }}
        />
      )}
    </div>
  );
}
