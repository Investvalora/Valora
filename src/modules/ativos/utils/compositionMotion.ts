import type { CompositionSlice } from "./compositionSlices";

export type CompositionMotionSlice = CompositionSlice & {
  target?: number;
  gap?: number | null;
  opacity?: number;
};
export type CompositionFrame = {
  slices: CompositionMotionSlice[];
  totalBRL: number;
};

const mix = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

function mixColor(from: string, to: string, progress: number) {
  const channels = [1, 3, 5].map((offset) =>
    Math.round(
      mix(
        parseInt(from.slice(offset, offset + 2), 16),
        parseInt(to.slice(offset, offset + 2), 16),
        progress,
      ),
    )
      .toString(16)
      .padStart(2, "0"),
  );
  return `#${channels.join("")}`;
}

/** Os mesmos segmentos mudam de tamanho e cor, inclusive entre agrupamentos. */
export function interpolateComposition(
  from: CompositionFrame,
  to: CompositionFrame,
  progress: number,
): CompositionFrame {
  if (progress >= 1) return to;
  if (progress <= 0) return from;
  return {
    totalBRL: mix(from.totalBRL, to.totalBRL, progress),
    slices: Array.from(
      { length: Math.max(from.slices.length, to.slices.length) },
      (_, index) => {
        const previous = from.slices[index];
        const next = to.slices[index];
        const slice = next ?? previous;
        return {
          ...slice,
          percent: mix(previous?.percent ?? 0, next?.percent ?? 0, progress),
          valueBRL: mix(previous?.valueBRL ?? 0, next?.valueBRL ?? 0, progress),
          color: mixColor(
            previous?.color ?? slice.color,
            next?.color ?? slice.color,
            progress,
          ),
          opacity: mix(
            previous?.opacity ?? (previous ? 1 : 0),
            next ? 1 : 0,
            progress,
          ),
          target:
            next?.target === undefined
              ? undefined
              : mix(previous?.target ?? next.target, next.target, progress),
          gap:
            next?.gap == null
              ? next?.gap
              : mix(previous?.gap ?? next.gap, next.gap, progress),
        };
      },
    ),
  };
}
