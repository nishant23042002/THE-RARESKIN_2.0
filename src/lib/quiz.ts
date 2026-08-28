import { ORDER, type FragranceSlug } from "./catalog";

/**
 * The "which one is yours" quiz — three questions, each option votes for one
 * fragrance, majority wins (ties break by canonical `ORDER`). Content ported
 * from the "Campaign" prototype.
 */
export interface QuizOption {
  label: string;
  key: FragranceSlug;
}

export interface QuizQuestion {
  prompt: string;
  options: QuizOption[];
}

export const QUIZ: QuizQuestion[] = [
  {
    prompt: "Where does it need to work?",
    options: [
      { label: "Daylight, the desk, everyday", key: "aurevan" },
      { label: "A long dinner, a room you want to hold", key: "orvelis" },
      { label: "After dark, when you want to be remembered", key: "vayren" },
    ],
  },
  {
    prompt: "How close should it stay?",
    options: [
      { label: "Just for me and anyone who leans in", key: "aurevan" },
      { label: "Arm's length, warm and steady", key: "orvelis" },
      { label: "It should reach the room before I do", key: "vayren" },
    ],
  },
  {
    prompt: "Pick a feeling.",
    options: [
      { label: "Clean, composed, unhurried", key: "aurevan" },
      { label: "Warm, golden, lived-in", key: "orvelis" },
      { label: "Dark, magnetic, a little unknowable", key: "vayren" },
    ],
  },
];

export function tallyWinner(answers: FragranceSlug[]): FragranceSlug {
  const scores: Record<FragranceSlug, number> = {
    aurevan: 0,
    orvelis: 0,
    vayren: 0,
  };
  for (const key of answers) scores[key] += 1;
  return ORDER.reduce((win, key) => (scores[key] > scores[win] ? key : win), ORDER[0]);
}
