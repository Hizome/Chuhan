import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { MosaicNode } from "react-mosaic-component";

export type TabType = "new" | "analysis" | "play";

export interface Tab {
  name: string;
  value: string;
  type: TabType;
}

export type ViewId = "left" | "topRight" | "bottomRight";

export interface WindowsState {
  currentNode: MosaicNode<ViewId>;
}

// Generate a unique tab id
let tabCounter = 0;
export function generateTabId(): string {
  return `tab-${++tabCounter}-${Date.now()}`;
}

// Tabs state persisted to sessionStorage
export const tabsAtom = atomWithStorage<Tab[]>(
  "chuhan-tabs",
  [{ name: "新对局", value: generateTabId(), type: "analysis" }],
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
  splitPercentage: 50,
};

export const windowsStateAtom = atomWithStorage<WindowsState>(
  "chuhan-windows-state",
  { currentNode: defaultLayout },
  undefined,
  { getOnInit: true }
);

// Derived: get active tab object
export const activeTabObjAtom = atom((get) => {
  const tabs = get(tabsAtom);
  const active = get(activeTabAtom);
  return tabs.find((t) => t.value === active) ?? tabs[0];
});
