import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { EngineOutput } from "../types/xiangqi";

export function useEngine(engineId: string) {
  const [output, setOutput] = useState<string>("");
  const [stats, setStats] = useState({
    knps: "-",
    score: "-",
    depth: "-",
    bestmove: "-",
    status: "idle",
  });
  const [isRunning, setIsRunning] = useState(false);
  const unlisteners = useRef<UnlistenFn[]>([]);

  useEffect(() => {
    return () => {
      unlisteners.current.forEach((u) => u());
      unlisteners.current = [];
    };
  }, []);

  const spawn = useCallback(
    async (path: string) => {
      await invoke("spawn_engine", { engineId, path });
      setIsRunning(true);
      setOutput("");
      setStats({ knps: "-", score: "-", depth: "-", bestmove: "-", status: "loading" });

      const stdoutUnlisten = await listen<string>(
        `engine:${engineId}/stdout`,
        (event) => {
          const line = event.payload;
          setOutput((prev) => prev + line + (line.endsWith("\n") ? "" : "\n"));

          if (line.includes("uciok")) {
            setStats((prev) => ({ ...prev, status: "uciok" }));
          }

          if (line.includes("readyok")) {
            setStats((prev) => ({ ...prev, status: "ready" }));
          }

          const bestMoveMatch = line.match(/bestmove\s+(\S+)/);
          if (bestMoveMatch) {
            setStats((prev) => ({
              ...prev,
              bestmove: bestMoveMatch[1],
              status: "bestmove",
            }));
          }

          // Parse info lines
          if (line.includes("info") && line.includes("score")) {
            const depthMatch = line.match(/depth (\d+)/);
            const scoreMatch = line.match(/score (?:cp|mate) (-?\d+)/);
            const nodesMatch = line.match(/nodes (\d+)/);
            const npsMatch = line.match(/nps (\d+)/);
            const timeMatch = line.match(/time (\d+)/);

            const depth = depthMatch ? depthMatch[1] : "-";
            const score = scoreMatch ? scoreMatch[1] : "-";
            const nodes = nodesMatch ? parseInt(nodesMatch[1]) : 0;
            const time = timeMatch ? parseInt(timeMatch[1]) : 1;
            const knps = npsMatch
              ? Math.round(parseInt(npsMatch[1]) / 1000).toLocaleString()
              : time > 0
              ? (nodes / time).toFixed(2)
              : "-";

            setStats((prev) => ({ ...prev, knps, score, depth, status: "searching" }));
          }
        }
      );

      const stderrUnlisten = await listen<string>(
        `engine:${engineId}/stderr`,
        (event) => {
          setOutput((prev) => prev + event.payload + (event.payload.endsWith("\n") ? "" : "\n"));
        }
      );

      const errorUnlisten = await listen<string>(
        `engine:${engineId}/error`,
        (event) => {
          setOutput((prev) => prev + "ERROR: " + event.payload + "\n");
        }
      );

      const terminatedUnlisten = await listen<number>(
        `engine:${engineId}/terminated`,
        () => {
          setIsRunning(false);
          setStats((prev) => ({ ...prev, status: "stopped" }));
        }
      );

      unlisteners.current = [
        stdoutUnlisten,
        stderrUnlisten,
        errorUnlisten,
        terminatedUnlisten,
      ];
    },
    [engineId]
  );

  const sendCommand = useCallback(
    async (command: string) => {
      await invoke("send_command", { engineId, command });
      setOutput((prev) => prev + `GUI -> Engine: ${command}\n`);
    },
    [engineId]
  );

  const kill = useCallback(async () => {
    await invoke("kill_engine", { engineId });
    setIsRunning(false);
    unlisteners.current.forEach((u) => u());
    unlisteners.current = [];
  }, [engineId]);

  return { output, stats, isRunning, spawn, sendCommand, kill };
}
