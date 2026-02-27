import { useSound } from "../hooks/useSound";
import { Volume2, VolumeX } from "lucide-react";

export const SoundControls = () => {
  const { volume, muted, setVolume, toggleMute } = useSound();

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    if (muted && v > 0) toggleMute();
    setVolume(v);
  };

  return (
    <div className="absolute top-4 right-4 z-50 p-3 flex items-center gap-2 bg-amber-900/80 border border-[#d6c5a7]/40 shadow-[0_4px_6px_rgba(0,0,0,0.3)] backdrop-blur-sm rounded-xl select-none">
      <button
        onClick={toggleMute}
        title={muted ? "Activate" : "Mute"}
        className="text-[#fcefd8] hover:text-[#ffdca8] transition-colors cursor-pointer"
      >
        {muted ? <Volume2 size={22} /> : <VolumeX size={22} />}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={handleVolume}
        className="w-24 accent-[#ffdca8] cursor-pointer"
      />
    </div>
  );
};
