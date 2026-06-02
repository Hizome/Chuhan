import { useCallback, useRef } from "react";

type SoundType = "select" | "move" | "capture" | "error";

const SOUND_SOURCES: Record<SoundType, string> = {
  select: "/assets/sounds/select.mp3",
  move: "/assets/sounds/go.mp3",
  capture: "/assets/sounds/eat.mp3",
  error: "/assets/sounds/goerror.mp3",
};

export function useSound() {
  const sounds = useRef<Partial<Record<SoundType, HTMLAudioElement>>>({});

  const play = useCallback((type: SoundType) => {
    try {
      if (!sounds.current[type]) {
        sounds.current[type] = new Audio(SOUND_SOURCES[type]);
      }
      const sound = sounds.current[type];
      if (!sound) return;

      sound.currentTime = 0;
      void sound.play();
    } catch {
      // Audio play failed, ignore
    }
  }, []);

  return { play };
}
