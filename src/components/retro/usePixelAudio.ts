"use client";

import { useCallback, useEffect, useRef } from "react";

/** Opt-in chiptune — M toggles. Bass + melody + light drums + birds. */
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
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctxRef.current = new Ctx();
    void ctxRef.current.resume();

    // Cozy Stardew-ish loop in C major / A minor flavors
    const melody = [
      262, 330, 392, 523, 392, 330, 294, 349, 392, 440, 392, 330, 262, 294, 330, 392,
    ];
    const bass = [131, 131, 165, 165, 147, 147, 110, 131, 98, 98, 131, 165, 147, 110, 98, 131];
    timerRef.current = window.setInterval(() => {
      const s = stepRef.current;
      const note = melody[s % melody.length];
      playNote(note, 0.16, "square", 0.032);
      playNote(bass[s % bass.length], 0.26, "triangle", 0.028);
      if (s % 2 === 0) playNote(98, 0.035, "square", 0.016);
      if (s % 4 === 2) playNote(196, 0.03, "square", 0.01);
      if (s % 8 === 7) playNote(523, 0.08, "triangle", 0.014);
      stepRef.current++;
    }, 220);

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
    setTimeout(() => playNote(784, 0.08, "triangle", 0.03), 280);
  }, [playNote]);

  const rehearseEnd = useCallback(() => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => playNote(f, 0.2, "square", 0.042), i * 78),
    );
  }, [playNote]);

  const thunder = useCallback(() => {
    playNote(55, 0.28, "sawtooth", 0.065);
    setTimeout(() => playNote(40, 0.4, "triangle", 0.055), 60);
    setTimeout(() => playNote(70, 0.18, "sawtooth", 0.04), 200);
  }, [playNote]);

  const chirp = useCallback(() => {
    playNote(1200 + Math.random() * 400, 0.04, "square", 0.018);
    setTimeout(() => playNote(1400 + Math.random() * 200, 0.03, "square", 0.012), 50);
  }, [playNote]);

  const levelUp = useCallback(() => {
    [392, 523, 659, 784].forEach((f, i) =>
      setTimeout(() => playNote(f, 0.12, "triangle", 0.04), i * 70),
    );
  }, [playNote]);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      if (Math.random() > 0.5) chirp();
    }, 2400);
    return () => clearInterval(id);
  }, [enabled, chirp]);

  return { blip, rehearseStart, rehearseEnd, thunder, chirp, levelUp };
}
