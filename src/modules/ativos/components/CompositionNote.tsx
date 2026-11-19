import { useEffect, useState } from "react";

/** Texto contínuo evita falhas de pintura nas letras; a cópia invisível reserva a altura. */
export function CompositionNote({
  text,
  animate = true,
}: {
  text: string;
  animate?: boolean;
}) {
  const [visible, setVisible] = useState(text);
  useEffect(() => {
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!animate || !motion || motion.matches) {
      setVisible(text);
      return;
    }
    const characters = Array.from(text);
    const duration = Math.min(1000, characters.length * 14);
    let started: number | undefined;
    let frameId = 0;
    const finish = () => {
      window.cancelAnimationFrame(frameId);
      setVisible(text);
    };
    const frame = (now: number) => {
      started ??= now;
      const progress =
        duration > 0 ? Math.min(1, (now - started) / duration) : 1;
      setVisible(
        characters.slice(0, Math.floor(progress * characters.length)).join(""),
      );
      if (progress < 1) frameId = window.requestAnimationFrame(frame);
    };
    setVisible("");
    frameId = window.requestAnimationFrame(frame);
    motion.addEventListener("change", finish);
    return () => {
      window.cancelAnimationFrame(frameId);
      motion.removeEventListener("change", finish);
    };
  }, [text, animate]);
  return (
    <>
      <span className="sr-only">{text}</span>
      <span
        className="composition-typed-text"
        data-text={text}
        aria-hidden="true"
      >
        <span className="absolute inset-0">{animate ? visible : text}</span>
      </span>
    </>
  );
}
