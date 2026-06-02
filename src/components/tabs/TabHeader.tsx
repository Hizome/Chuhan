import { useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useAtom } from "jotai";
import { Group, ScrollArea, ActionIcon, Text } from "@mantine/core";
import { IconX, IconPlus } from "@tabler/icons-react";
import { tabsAtom, activeTabAtom, generateTabId } from "../../state/uiStore";

export default function TabHeader() {
  const [tabs, setTabs] = useAtom(tabsAtom);
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newTabs = Array.from(tabs);
      const [reordered] = newTabs.splice(result.source.index, 1);
      newTabs.splice(result.destination.index, 0, reordered);
      setTabs(newTabs);
    },
    [tabs, setTabs]
  );

  const addTab = useCallback(() => {
    const newTab = {
      name: "新对局",
      value: generateTabId(),
      type: "analysis" as const,
    };
    setTabs([...tabs, newTab]);
    setActiveTab(newTab.value);
  }, [tabs, setTabs, setActiveTab]);

  const closeTab = useCallback(
    (e: React.MouseEvent, value: string) => {
      e.stopPropagation();
      const newTabs = tabs.filter((t) => t.value !== value);
      if (newTabs.length === 0) {
        const emptyTab = {
          name: "新对局",
          value: generateTabId(),
          type: "analysis" as const,
        };
        newTabs.push(emptyTab);
        setActiveTab(emptyTab.value);
      } else if (activeTab === value) {
        setActiveTab(newTabs[0].value);
      }
      setTabs(newTabs);
    },
    [tabs, activeTab, setTabs, setActiveTab]
  );

  return (
    <Group gap="xs" style={{ height: "2.2rem", userSelect: "none" }}>
      <ScrollArea style={{ flex: 1, height: "100%" }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="tabs" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: "flex", height: "100%" }}
              >
                {tabs.map((tab, index) => (
                  <Draggable key={tab.value} draggableId={tab.value} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          display: "flex",
                          alignItems: "center",
                          padding: "0 12px",
                          cursor: "pointer",
                          borderTop:
                            activeTab === tab.value
                              ? "2px solid var(--mantine-primary-color-filled)"
                              : "2px solid transparent",
                          borderBottom:
                            activeTab === tab.value
                              ? "2px solid transparent"
                              : "2px solid var(--mantine-color-dark-4)",
                          backgroundColor:
                            activeTab === tab.value
                              ? "var(--mantine-color-dark-7)"
                              : snapshot.isDragging
                              ? "var(--mantine-color-dark-6)"
                              : "transparent",
                        }}
                        onClick={() => setActiveTab(tab.value)}
                      >
                        <Text size="sm" fw={activeTab === tab.value ? 700 : 400}>
                          {tab.name}
                        </Text>
                        <ActionIcon
                          size="xs"
                          variant="transparent"
                          ml="xs"
                          onClick={(e) => closeTab(e, tab.value)}
                        >
                          <IconX size={12} />
                        </ActionIcon>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ScrollArea>
      <ActionIcon size="sm" variant="transparent" onClick={addTab}>
        <IconPlus size={16} />
      </ActionIcon>
    </Group>
  );
}
