import { useEffect } from "react";
import { useAtom } from "jotai";
import { Tabs } from "@mantine/core";
import TabHeader from "./TabHeader";
import BoardAnalysis from "../boards/BoardAnalysis";
import NewTabHome from "./NewTabHome";
import { tabsAtom, activeTabAtom, tabPayloadsAtom } from "../../state/uiStore";

export default function BoardsPage() {
  const [tabs] = useAtom(tabsAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const [, setPayloads] = useAtom(tabPayloadsAtom);

  // Ensure activeTab is valid; fallback to first tab
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.value === activeTab)) {
      setActiveTab(tabs[0].value);
    }
  }, [tabs, activeTab, setActiveTab]);

  return (
    <Tabs
      value={activeTab}
      onChange={(v) => v && setActiveTab(v)}
      keepMounted={false}
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <TabHeader />

      {tabs.map((tab) => (
        <Tabs.Panel
          key={tab.value}
          value={tab.value}
          style={{ flex: 1, overflow: "hidden" }}
        >
          {tab.type === "new" ? (
            <NewTabHome
              tabId={tab.value}
              onStartAnalysis={(tree) => {
                setPayloads((prev) => ({ ...prev, [tab.value]: tree }));
              }}
            />
          ) : (
            <BoardAnalysis tabId={tab.value} />
          )}
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}
