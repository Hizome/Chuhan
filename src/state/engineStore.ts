import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import type { LocalEngineConfig } from "../types/engine";

export const enginesAtom = atomWithStorage<LocalEngineConfig[]>(
  "chuhan-engines",
  [],
  undefined,
  { getOnInit: true }
);

export const selectedEngineIdAtom = atomWithStorage<string | null>(
  "chuhan-selected-engine-id",
  null,
  undefined,
  { getOnInit: true }
);

export const selectedEngineAtom = atom((get) => {
  const engines = get(enginesAtom);
  const selectedId = get(selectedEngineIdAtom);
  return engines.find((engine) => engine.id === selectedId) ?? engines[0] ?? null;
});

export function createDefaultSettings(engine: LocalEngineConfig) {
  return engine.options.reduce<Record<string, string | number | boolean | null>>(
    (settings, option) => {
      if (["Hash", "MultiPV", "Threads"].includes(option.name) && option.kind !== "button") {
        settings[option.name] = option.default;
      }
      return settings;
    },
    {}
  );
}
