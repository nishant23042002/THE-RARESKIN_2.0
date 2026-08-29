"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Flacon } from "@/components/ui/flacon";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { cn } from "@/lib/cn";
import { QUIZ, tallyWinner } from "@/lib/quiz";
import { formatINR, type Fragrance, type FragranceSlug } from "@/lib/catalog";

const STEPS = QUIZ.length; // 3 questions; step === STEPS -> result

export function Quiz({ fragrances }: { fragrances: Fragrance[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FragranceSlug[]>([]);
  const [stageH, setStageH] = useState<number>();
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // keep the stage exactly as tall as the visible panel — no jump on advance
  useEffect(() => {
    const el = panelRefs.current[step];
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      setStageH(el.offsetHeight);
    };
    raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [step]);

  function pick(key: FragranceSlug) {
    setAnswers((prev) => [...prev.slice(0, step), key]);
    setStep((s) => Math.min(s + 1, STEPS));
  }

  function retake() {
    setAnswers([]);
    setStep(0);
  }

  const winner = step === STEPS ? tallyWinner(answers) : null;
  const match = winner
    ? (fragrances.find((f) => f.slug === winner) ?? null)
    : null;
  const filled = step >= STEPS ? STEPS : step + 1;

  return (
    <section
      id="quiz"
      className="flex min-h-svh flex-col justify-center scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] border-t border-line"
    >
      <Container className="grid gap-[clamp(36px,6vw,60px)] py-[clamp(48px,9vw,104px)] lg:grid-cols-[0.82fr_1.18fr] lg:items-start lg:gap-20">
        <div>
          <span className="eyebrow mb-3.5 block">Not sure which</span>
          <h2 className="text-[clamp(1.9rem,4.4vw,2.9rem)]">
            Three questions. One that is yours.
          </h2>
          <p className="mt-4 max-w-[34ch] text-[15px] text-ink-2">
            A short way in. Answer honestly and we&rsquo;ll point you to the one
            most people like you keep wearing.
          </p>
          <div className="mt-7 flex items-center gap-2" aria-hidden>
            {Array.from({ length: STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-[2px] w-[26px] transition-colors duration-300",
                  i < filled ? "bg-ink" : "bg-line-2",
                )}
              />
            ))}
          </div>
        </div>

        <div
          className="quiz-stage min-h-[320px] rounded-[3px] border border-line-2 bg-surface"
          style={stageH ? { height: stageH } : undefined}
        >
          {QUIZ.map((q, i) => (
            <div
              key={q.prompt}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              data-active={step === i}
              className="quiz-panel p-[clamp(26px,4vw,46px)]"
              inert={step !== i}
            >
              <p className="serif-italic max-w-[22ch] text-[clamp(1.5rem,3vw,2.05rem)] leading-[1.3]">
                {q.prompt}
              </p>
              <div className="mt-[clamp(20px,3vw,32px)] grid gap-2.5">
                {q.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => pick(opt.key)}
                    disabled={step !== i}
                    className="quiz-opt flex w-full items-center gap-3.5 rounded-[2px] border border-line-2 px-[17px] py-[15px] text-left text-[14px] text-ink transition-[border-color,background-color,transform] duration-150 hover:border-ink hover:bg-surface-2 active:scale-[0.99]"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div
            ref={(el) => {
              panelRefs.current[STEPS] = el;
            }}
            data-active={step === STEPS}
            data-result
            className="quiz-panel p-[clamp(26px,4vw,46px)]"
            inert={step !== STEPS}
          >
            {match && (
              <>
                <p className="text-[10px] tracking-[0.22em] text-ink-3 uppercase">
                  Your match
                </p>
                <div className="mt-4 grid items-center gap-6 sm:grid-cols-[120px_1fr] sm:gap-8">
                  <span
                    className="mx-auto block w-full max-w-[120px] sm:mx-0"
                    style={{
                      filter: `drop-shadow(0 22px 28px ${match.juice}44)`,
                    }}
                  >
                    <Flacon fragrance={match.slug} />
                  </span>
                  <div>
                    <h3 className="text-[clamp(1.9rem,5vw,2.7rem)] tracking-[0.1em]">
                      {match.name}
                    </h3>
                    <p className="mt-2.5 text-[9.5px] tracking-[0.14em] text-ink-3 uppercase">
                      {match.title}
                    </p>
                    <p className="serif-italic mt-3 max-w-[40ch] text-[1.1rem] leading-[1.5] text-ink-2">
                      {match.poem}
                    </p>
                    <p className="mt-3.5 text-[9px] tracking-[0.1em] text-ink-3 uppercase">
                      {match.notes.join(" · ")}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-2.5">
                      <AddToBagButton
                        sku={match.sku}
                        name={match.name}
                        price={match.price}
                        mrp={match.mrp}
                        fragrance={match.slug}
                        href={`/fragrances/${match.slug}`}
                        meta={`Extrait · ${match.volumeMl} ml`}
                        label={`Add to bag · ${formatINR(match.price)}`}
                        variant="solid"
                        size="sm"
                      />
                      <Button
                        href={`/fragrances/${match.slug}`}
                        variant="onDark"
                        size="sm"
                      >
                        Read {match.name}
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={retake}
                      className="mt-4 inline-flex items-center gap-2 text-[10px] tracking-[0.12em] text-ink-3 uppercase transition-colors hover:text-ink"
                    >
                      <span aria-hidden>&larr;</span> Retake the quiz
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
