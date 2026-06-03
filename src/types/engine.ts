export type EngineProtocol = "uci" | "ucci";

export type EngineOptionKind = "spin" | "check" | "combo" | "string" | "button" | string;

export interface EngineOptionConfig {
  name: string;
  kind: EngineOptionKind;
  default: string | number | boolean | null;
  min?: number | null;
  max?: number | null;
  vars: string[];
}

export interface EngineHandshake {
  name: string;
  author?: string | null;
  protocol: EngineProtocol;
  options: EngineOptionConfig[];
  raw: string;
}

export type EngineGoMode =
  | { type: "depth"; value: number }
  | { type: "movetime"; value: number };

export interface LocalEngineConfig {
  id: string;
  name: string;
  path: string;
  protocol: EngineProtocol;
  author?: string | null;
  enabled: boolean;
  go: EngineGoMode;
  options: EngineOptionConfig[];
  settings: Record<string, string | number | boolean | null>;
  lastVerifiedAt?: number;
}
