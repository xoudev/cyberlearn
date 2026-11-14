"use client";

// Client boundary: reveal sections once and follow the scroll, without hiding server-rendered content.
import { useEffect } from "react";

/** The share of the viewport height where a route step counts as reached. */
const ROUTE_LINE = 0.62;

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function HomeMotion(): null {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cl-home");
    if (
      !root ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
          entry.target.dataset.motionState = "revealed";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    // Only what starts below the fold waits: what the visitor already sees is never hidden.
    const targets = root.querySelectorAll<HTMLElement>("[data-home-reveal]");
    targets.forEach((target) => {
      if (target.getBoundingClientRect().top < window.innerHeight) return;
      target.dataset.motionState = "pending";
      observer.observe(target);
    });

    const route = root.querySelector<HTMLElement>("[data-home-route]");
    const steps = route ? [...route.querySelectorAll<HTMLElement>("[data-home-step]")] : [];
    let frame = 0;
    function follow(): void {
      frame = 0;
      if (!root) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty(
        "--home-progress",
        String(scrollable > 0 ? clamp(window.scrollY / scrollable) : 0),
      );
      if (!route) return;
      const line = window.innerHeight * ROUTE_LINE;
      const box = route.getBoundingClientRect();
      route.style.setProperty("--route-progress", String(clamp((line - box.top) / box.height)));
      for (const step of steps) {
        step.dataset.reached = String(step.getBoundingClientRect().top < line);
      }
    }
    function onScroll(): void {
      if (frame === 0) frame = window.requestAnimationFrame(follow);
    }
    root.dataset.motion = "live";
    follow();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      delete root.dataset.motion;
      targets.forEach((target) => {
        if (target.dataset.motionState === "pending") delete target.dataset.motionState;
      });
    };
  }, []);
  return null;
}
