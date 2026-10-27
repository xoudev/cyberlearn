"use client";

// Client boundary: observe section entrances once without hiding server-rendered content.
import { useEffect } from "react";

export function HomeMotion(): null {
  useEffect(() => {
    const root = document.querySelector(".cl-home");
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
    const sections = root.querySelectorAll<HTMLElement>("[data-home-reveal]");
    sections.forEach((section) => {
      if (section.getBoundingClientRect().top >= window.innerHeight) observer.observe(section);
    });
    return () => {
      observer.disconnect();
    };
  }, []);
  return null;
}
