"use client";

/**
 * Single GSAP entry point. Import `gsap`, `useGSAP` and plugins from here so
 * registration happens exactly once. GSAP core + ScrollTrigger are SSR-safe;
 * `useGSAP` falls back to `useEffect` when `window` is undefined.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, useGSAP, ScrollTrigger };
