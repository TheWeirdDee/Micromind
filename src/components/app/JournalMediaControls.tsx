'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Image as ImageIcon, Mic, Loader2 } from 'lucide-react';
import { fetchJournalImage, transcribeVoiceNote } from '@/lib/journalMedia';

export function PhotoAttachButton({
  previewUrl,
  onSelect,
  onRemove,
}: { previewUrl: string | null; onSelect: (file: File) => void; onRemove: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (previewUrl) {
    return (
      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-border shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Attached" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 p-0.5 bg-bg/80 rounded-full text-text-muted hover:text-red-400"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
      >
        <ImageIcon className="w-3.5 h-3.5" /> Add Photo
      </button>
    </>
  );
}

export function VoiceRecordButton({ onTranscribed }: { onTranscribed: (text: string) => void }) {
  const [isRecording, setIsRecording]       = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [seconds, setSeconds]               = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopStream();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stopStream();
        if (timerRef.current) clearInterval(timerRef.current);
        setSeconds(0);
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setIsTranscribing(true);
        try {
          const text = await transcribeVoiceNote(blob);
          if (text.trim()) onTranscribed(text.trim());
        } catch (err) {
          console.warn('Transcription failed', err);
        } finally {
          setIsTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err) {
      console.warn('Mic permission denied or unavailable', err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  if (isTranscribing) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribing...
      </span>
    );
  }

  if (isRecording) {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return (
      <button
        type="button"
        onClick={stopRecording}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-red-400/40 bg-red-400/10 rounded-lg text-xs font-mono text-red-400"
      >
        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        {mm}:{ss} · Stop
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-mono text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
    >
      <Mic className="w-3.5 h-3.5" /> Record
    </button>
  );
}

export function EntryImage({ raw }: { raw: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchJournalImage(raw).then(u => {
      if (cancelled) { if (u) URL.revokeObjectURL(u); return; }
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [raw]);

  if (!url) {
    return <div className="w-full max-w-xs h-32 rounded-xl bg-surface-2 animate-pulse" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="Journal attachment" className="w-full max-w-xs rounded-xl border border-border object-cover" />
  );
}
