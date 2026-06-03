// ============================
// 象棋核心类型定义
// ============================

export interface Move {
  from: string; // 如 "e2"
  to: string;   // 如 "e4"
  promotion?: string;
  capture?: boolean;
}

export interface TreeNode {
  fen: string;
  move: Move | null;
  san: string | null; // 中文记谱法，如 "炮二平五"
  children: TreeNode[];
  annotations: Annotation[];
  comment: string;
  score: number | null;
  depth: number | null;
  shapes: DrawShape[];
  clock?: number;
}

export interface TreeState {
  root: TreeNode;
  headers: GameHeaders;
  position: number[]; // 当前路径，如 [0, 1, 0]
  dirty: boolean;
}

export interface GameHeaders {
  title?: string;
  red?: string;
  black?: string;
  date?: string;
  site?: string;
  event?: string;
  result?: string;
  round?: string;
  orientation?: "red" | "black";
}

export type Annotation =
  | "!"
  | "?"
  | "!!"
  | "??"
  | "!?"
  | "?!"
  | "+="
  | "="
  | "-="
  | "+/-"
  | "-/+"
  | "++-";

export interface DrawShape {
  orig: string;
  dest?: string;
  brush: string; // 如 "green", "red", "blue"
}

export interface EngineConfig {
  id: string;
  name: string;
  path: string;
  protocol: "uci" | "ucci";
  options: Record<string, string | number | boolean>;
}

export interface EngineOutput {
  type: "info" | "bestmove" | "error" | "ready";
  data: string;
  parsed?: {
    depth?: number;
    score?: number;
    nodes?: number;
    time?: number;
    nps?: number;
    pv?: string[];
    bestmove?: string;
  };
}

export const START_FEN =
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1";
