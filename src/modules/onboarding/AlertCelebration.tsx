import { Check, Sparkle } from "lucide-react";
import type { CSSProperties } from "react";

const sparkles = [
  [-66, -33, -92, -58],
  [48, -48, 73, -81],
  [62, 29, 94, 58],
  [-50, 42, -76, 75],
  [-17, -62, -29, -99],
  [23, 58, 38, 88],
];

export function AlertCelebration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto mb-5 grid size-32 place-items-center"
    >
      <div className="absolute inset-1 rounded-full bg-emerald-400/10 blur-xl" />
      <div className="first-access-check grid size-20 place-items-center rounded-full border border-emerald-300/45 bg-emerald-400/15 text-emerald-300">
        <Check size={38} strokeWidth={2.5} />
      </div>
      {sparkles.map(([x, y, endX, endY], index) => (
        <Sparkle
          key={x}
          size={index % 2 ? 15 : 19}
          className={`first-access-sparkle absolute ${index % 2 ? "text-[#5cc8ff]" : "text-emerald-300"}`}
          style={
            {
              "--spark-x": `${x}px`,
              "--spark-y": `${y}px`,
              "--spark-end-x": `${endX}px`,
              "--spark-end-y": `${endY}px`,
              "--spark-delay": `${index * 55}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
