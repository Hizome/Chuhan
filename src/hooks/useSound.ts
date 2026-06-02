import { useCallback, useRef } from "react";

export function useSound() {
  const moveSound = useRef<HTMLAudioElement | null>(null);
  const captureSound = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((type: "move" | "capture") => {
    try {
      if (type === "capture") {
        if (!captureSound.current) {
          captureSound.current = new Audio("/libs/xiangqiboardjs-0.3.3/sounds/capture.wav");
        }
        captureSound.current.currentTime = 0;
        captureSound.current.play();
      } else {
        if (!moveSound.current) {
          moveSound.current = new Audio("/libs/xiangqiboardjs-0.3.3/sounds/move.wav");
        }
        moveSound.current.currentTime = 0;
        moveSound.current.play();
      }
    } catch {
      // Audio play failed, ignore
    }
  }, []);

  return { play };
}
