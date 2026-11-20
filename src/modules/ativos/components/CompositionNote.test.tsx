import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CompositionNote } from "./CompositionNote";

afterEach(() => vi.unstubAllGlobals());

it("digita o texto completo incluindo a segunda letra e não reinicia ao renderizar novamente", () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((frame: FrameRequestCallback) => {
      frames.push(frame);
      return frames.length;
    }),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  const text = "Distribuição do patrimônio por classe de ativo.";
  const { container, rerender } = render(<CompositionNote text={text} />);
  const visible = container.querySelector(".composition-typed-text > span")!;
  expect(visible.textContent).toBe("");
  act(() => frames.shift()?.(0));
  act(() => frames.shift()?.(28));
  expect(visible.textContent).toBe("Di");
  rerender(<CompositionNote text={text} />);
  expect(visible.textContent).toBe("Di");
  act(() => frames.shift()?.(1000));
  expect(visible.textContent).toBe(text);
  expect(visible.childElementCount).toBe(0);
  expect(visible.parentElement).toHaveAttribute("data-text", text);
});

it("mostra o texto inteiro sem animar para movimento reduzido", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true })),
  );
  const { container, rerender } = render(
    <CompositionNote text="Participação de cada ativo" />,
  );
  expect(
    container.querySelector(".composition-typed-text > span"),
  ).toHaveTextContent("Participação de cada ativo");
  rerender(<CompositionNote text="Setores de ações BR e BDRs" />);
  expect(
    container.querySelector(".composition-typed-text > span"),
  ).toHaveTextContent("Setores de ações BR e BDRs");
});
