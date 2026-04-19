import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  url: string;
  durationMs: number | null;
  mine: boolean;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function VoiceNotePlayer({ url, durationMs, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [actualDur, setActualDur] = useState<number | null>(durationMs ? durationMs / 1000 : null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      const d = a.duration && isFinite(a.duration) ? a.duration : actualDur ?? 0;
      setProgress(d > 0 ? a.currentTime / d : 0);
    };
    const onMeta = () => { if (a.duration && isFinite(a.duration)) setActualDur(a.duration); };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, [actualDur]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { void a.play(); setPlaying(true); }
  };

  const displaySec = playing && actualDur ? actualDur * (1 - progress) : (actualDur ?? 0);

  return (
    <div className={cn("flex items-center gap-3 px-2 py-1.5 min-w-[180px]")}>
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground",
        )}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
      </button>
      <div className="flex-1">
        <div className={cn("h-1.5 w-full overflow-hidden rounded-full", mine ? "bg-primary-foreground/25" : "bg-foreground/15")}>
          <div
            className={cn("h-full transition-[width]", mine ? "bg-primary-foreground" : "bg-primary")}
            style={{ width: `${Math.max(2, progress * 100)}%` }}
          />
        </div>
        <div className={cn("mt-1 font-mono text-[10px] tabular-nums", mine ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {fmt(displaySec)}
        </div>
      </div>
      <audio ref={audioRef} src={url} preload="metadata" />
    </div>
  );
}
