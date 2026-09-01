"use client";

import { useCallback, useEffect, useRef } from "react";

/** Opt-in chiptune — M toggles. Bass + melody + light drums. */
export function usePixelAudio(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  const playNote = useCallback(
    (freq: number, dur: number, type: OscillatorType = "square", vol = 0.04) => {
      const ctx = ctxRef.current;
      if (!ctx || !enabled) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    ctxRef.current = new AudioContext();
    const melody = [262, 330, 392, 440, 392, 330, 294, 330, 349, 392, 330, 262];
    const bass = [131, 131, 165, 165, 147, 147, 110, 131];
    timerRef.current = window.setInterval(() => {
      const s = stepRef.current;
      const note = melody[s % melody.length];
      playNote(note, 0.14, "square", 0.035);
      playNote(bass[s % bass.length], 0.22, "triangle", 0.03);
      if (s % 2 === 0) playNote(90, 0.04, "square", 0.018);
      if (s % 8 === 4) playNote(180, 0.05, "sawtooth", 0.012);
      stepRef.current++;
    }, 240);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, [enabled, playNote]);

  const blip = useCallback(() => {
    playNote(880, 0.06, "square", 0.05);
    setTimeout(() => playNote(1175, 0.05, "square", 0.04), 45);
  }, [playNote]);

  const rehearseStart = useCallback(() => {
    playNote(196, 0.12, "sawtooth", 0.05);
    setTimeout(() => playNote(392, 0.14, "square", 0.05), 90);
    setTimeout(() => playNote(523, 0.1, "square", 0.04), 180);
  }, [playNote]);

  const rehearseEnd = useCallback(() => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playNote(f, 0.22, "square", 0.045), i * 85),
    );
  }, [playNote]);

  const thunder = useCallback(() => {
    playNote(55, 0.25, "sawtooth", 0.06);
    setTimeout(() => playNote(40, 0.35, "triangle", 0.05), 60);
  }, [playNote]);

  const chirp = useCallback(() => {
    playNote(1200 + Math.random() * 400, 0.04, "square", 0.02);
    setTimeout(() => playNote(1400 + Math.random() * 200, 0.03, "square", 0.015), 50);
  }, [playNote]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (Math.random() > 0.55) chirp();
    }, 2800);
    return () => clearInterval(id);
  }, [enabled, chirp]);

  return { blip, rehearseStart, rehearseEnd, thunder, chirp };
}
