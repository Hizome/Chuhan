import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { MosaicNode } from "react-mosaic-component";
import type { TreeState } from "../types/xiangqi";

export type TabType = "new" | "analysis" | "play";

export interface Tab {
  name: string;
  value: string;
  type: TabType;
}

export interface RecentFile {
  name: string;
  path: string;
  lastOpened: number;
}

export type ViewId = "left" | "topRight" | "bottomRight";

export interface WindowsState {
  currentNode: MosaicNode<ViewId>;
}

// Generate a unique tab id
let tabCounter = 0;
export function generateTabId(): string {
  return `tab-${++tabCounter}-${Date.now().toString(36)}`;
}

// Tabs state persisted to sessionStorage
export const tabsAtom = atomWithStorage<Tab[]>(
  "chuhan-tabs",
  [{ name: "首页", value: generateTabId(), type: "new" }],
  undefined,
  { getOnInit: true }
);

export const activeTabAtom = atomWithStorage<string>(
  "chuhan-active-tab",
  "",
  undefined,
  { getOnInit: true }
);

// Mosaic layout state persisted to localStorage
const defaultLayout: MosaicNode<ViewId> = {
  direction: "row",
  first: "left",
  second: {
    direction: "column",
    first: "topRight",
    second: "bottomRight",
  },
  splitPercentage: 65,
};

export const windowsStateAtom = atomWithStorage<WindowsState>(
  "chuhan-windows-state",
  { currentNode: defaultLayout },
  undefined,
  { getOnInit: true }
);

// Recent files persisted to localStorage
export const recentFilesAtom = atomWithStorage<RecentFile[]>(
  "chuhan-recent-files",
  [],
  undefined,
  { getOnInit: true }
);

// Non-persistent payloads for tab initialization (e.g. loaded tree from file)
export const tabPayloadsAtom = atom<Record<string, TreeState>>({});

// Derived: get active tab object
export const activeTabObjAtom = atom((get) => {
  const tabs = get(tabsAtom);
  const active = get(activeTabAtom);
  return tabs.find((t) => t.value === active) ?? tabs[0];
});
