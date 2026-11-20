import { useEffect, useMemo, useRef, useState } from "react";
import {
  interpolateComposition,
  type CompositionFrame,
} from "../utils/compositionMotion";

type Snapshot = { scope: string; frame: CompositionFrame; progress: number };

/** Preserva o último quadro, inclusive quando outra troca interrompe a transição. */
export function useCompositionMotion(scope: string, target: CompositionFrame) {
  // Arrays equivalentes recriados pela avaliação não devem reiniciar a animação.
  const serialized = JSON.stringify(target);
  const destination = useMemo<CompositionFrame>(
    () => JSON.parse(serialized),
    [serialized],
  );
  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({
    scope,
    frame: destination,
    progress: 1,
  }));
  const current = useRef(snapshot);
  useEffect(() => {
    const from = current.current;
    let frameId = 0;
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const commit = (frame: CompositionFrame, progress: number) => {
      const next = { scope, frame, progress };
      current.current = next;
      setSnapshot(next);
    };
    const finish = () => {
      window.cancelAnimationFrame(frameId);
      commit(destination, 1);
    };
    if (from.frame === destination && from.scope === scope) return;
    if (
      from.scope !== scope ||
      !motion ||
      motion.matches ||
      document.documentElement.dataset.inputMode === 'keyboard' ||
      !from.frame.slices.length ||
      !destination.slices.length
    ) {
      finish();
      return;
    }
    let started: number | undefined;
    const frame = (now: number) => {
      started ??= now;
      const linear = Math.min(1, (now - started) / 700);
      const eased = linear * linear * (3 - 2 * linear);
      commit(interpolateComposition(from.frame, destination, eased), linear);
      if (linear < 1) frameId = window.requestAnimationFrame(frame);
    };
    commit(from.frame, 0);
    frameId = window.requestAnimationFrame(frame);
    motion.addEventListener("change", finish);
    window.addEventListener('keydown', finish);
    return () => {
      window.cancelAnimationFrame(frameId);
      motion.removeEventListener("change", finish);
      window.removeEventListener('keydown', finish);
    };
  }, [scope, destination]);
  return snapshot.scope === scope
    ? snapshot
    : { scope, frame: destination, progress: 1 };
}
