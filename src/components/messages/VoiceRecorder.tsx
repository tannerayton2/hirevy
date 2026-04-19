import { useEffect, useRef, useState } from "react";
import { Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MAX_SECONDS = 60;

interface Props {
  onComplete: (blob: Blob, durationMs: number, mimeType: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onComplete, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => stopTick(), []);

  const stopTick = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const start = async () => {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      cancelledRef.current = false;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const dur = Date.now() - startedAtRef.current;
        if (!cancelledRef.current && chunksRef.current.length) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          onComplete(blob, Math.min(dur, MAX_SECONDS * 1000), mimeType);
        }
        setRecording(false);
        setSeconds(0);
        stopTick();
      };
      rec.start();
      recRef.current = rec;
      startedAtRef.current = Date.now();
      setRecording(true);
      setSeconds(0);
      tickRef.current = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) stop();
      }, 200);
    } catch (err) {
      toast({
        title: "Microphone blocked",
        description: "Allow microphone access in your browser to record voice notes.",
        variant: "destructive",
      });
    }
  };

  const stop = () => {
    if (!recRef.current || recRef.current.state === "inactive") return;
    recRef.current.stop();
  };

  const cancel = () => {
    cancelledRef.current = true;
    stop();
  };

  if (recording) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="font-mono text-xs tabular-nums text-foreground">
          0:{seconds.toString().padStart(2, "0")} / 1:00
        </span>
        <div className="flex-1" />
        <Button type="button" size="sm" variant="ghost" onClick={cancel} aria-label="Cancel recording">
          <X className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" onClick={stop} aria-label="Stop recording">
          <Square className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={start}
      disabled={disabled}
      aria-label="Record voice note"
      className={cn("shrink-0")}
    >
      <Mic className="h-5 w-5" />
    </Button>
  );
}
