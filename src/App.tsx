import { useState } from "react";
import { AppShell, createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "react-mosaic-component/react-mosaic-component.css";
import "./styles/global.css";
import TopBar from "./components/layout/TopBar";
import SideBar from "./components/layout/SideBar";
import BoardsPage from "./components/tabs/BoardsPage";

const theme = createTheme({
  primaryColor: "red",
  colors: {
    dark: [
      "#C1C2C5",
      "#A6A7AB",
      "#909296",
      "#5c5f66",
      "#373A40",
      "#2C2E33",
      "#25262b",
      "#1A1B1E",
      "#141517",
      "#101113",
    ],
  },
});

function App() {
  const [activePage, setActivePage] = useState<"boards" | "databases" | "engines" | "settings">("boards");

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <AppShell
        navbar={{ width: "3rem", breakpoint: 0 }}
        header={{ height: "2.25rem" }}
        styles={{
          main: { height: "100vh", userSelect: "none" },
        }}
      >
        <AppShell.Header>
          <TopBar />
        </AppShell.Header>
        <AppShell.Navbar p="xs">
          <SideBar active={activePage} onChange={setActivePage} />
        </AppShell.Navbar>
        <AppShell.Main style={{ overflow: "hidden" }}>
          {activePage === "boards" && <BoardsPage />}
          {activePage === "databases" && <div>数据库（待实现）</div>}
          {activePage === "engines" && <div>引擎管理（待实现）</div>}
          {activePage === "settings" && <div>设置（待实现）</div>}
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
