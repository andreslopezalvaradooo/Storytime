import { Howl, Howler } from "howler";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const SOUND_SRC = {
  open: "/audios/open-book.wav",
  flip: "/audios/flip-page.wav",
  close: "/audios/close-book.wav",
};

const bank = Object.fromEntries(
  Object.entries(SOUND_SRC).map(([k, src]) => [
    k,
    new Howl({ src: [src], preload: true }),
  ])
);

export const useSound = () => {
  const [volume, setVolume] = useState(() =>
    parseFloat(localStorage.getItem("sb-vol") || 1)
  );

  const [muted, setMuted] = useState(() =>
    JSON.parse(localStorage.getItem("sb-muted") || "false")
  );

  useLayoutEffect(() => {
    const unlock = () => {
      if (Howler.ctx?.state === "suspended") Howler.ctx.resume();
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    Object.values(bank).forEach((h) => {
      h.volume(volume);
      h.mute(muted);
    });

    localStorage.setItem("sb-vol", volume);
    localStorage.setItem("sb-muted", muted);
    // localStorage.setItem("sb-muted", JSON.stringify(muted));
  }, [volume, muted]);

  const playSound = useCallback((name) => {
    bank[name]?.stop().play();
  }, []);

  return {
    volume,
    muted,
    setVolume,
    toggleMute: () => setMuted((m) => !m),
    playSound,
  };
};