import { useCallback } from "react";
import { useAtom } from "jotai";
import { Stack } from "@mantine/core";
import TabHeader from "./TabHeader";
import MosaicLayout from "../layout/MosaicLayout";
import BoardAnalysis from "../boards/BoardAnalysis";
import { tabsAtom, activeTabAtom, windowsStateAtom } from "../../state/uiStore";
import type { MosaicNode } from "react-mosaic-component";
import type { ViewId } from "../../state/uiStore";

export default function BoardsPage() {
  const [tabs] = useAtom(tabsAtom);
  const [activeTab] = useAtom(activeTabAtom);
  const [windowsState, setWindowsState] = useAtom(windowsStateAtom);

  const handleMosaicChange = useCallback(
    (node: MosaicNode<ViewId> | null) => {
      if (node) {
        setWindowsState({ currentNode: node });
      }
    },
    [setWindowsState]
  );

  return (
    <Stack gap={0} style={{ height: "100%" }}>
      <TabHeader />
      <div style={{ flex: 1, overflow: "hidden" }}>
        {tabs.map((tab) => (
          <div
            key={tab.value}
            style={{
              display: activeTab === tab.value ? "flex" : "none",
              height: "100%",
              flexDirection: "column",
            }}
          >
            <BoardAnalysis tabId={tab.value} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <MosaicLayout
                value={windowsState.currentNode}
                onChange={handleMosaicChange}
              />
            </div>
          </div>
        ))}
      </div>
    </Stack>
  );
}
