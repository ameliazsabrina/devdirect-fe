"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function MarqueeCTA() {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const firstRowsRef = useRef<HTMLDivElement[]>([]);
  const secondRowRef = useRef<HTMLDivElement>(null);
  const thirdRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const marquee = marqueeRef.current;
    const firstRows = firstRowsRef.current.filter(Boolean);
    const secondRow = secondRowRef.current;
    const thirdRow = thirdRowRef.current;

    if (
      !container ||
      !marquee ||
      firstRows.length === 0 ||
      !secondRow ||
      !thirdRow
    )
      return;

    gsap.set(firstRows.concat(thirdRow), { x: 0 });
    gsap.set(secondRow, { x: 0 });

    // Store component-specific timeline for proper cleanup
    let componentTimeline: gsap.core.Timeline | null = null;

    const createScrollTrigger = () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: marquee,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      tl.to(firstRows.concat(thirdRow), {
        x: "-50%",
        duration: 2,
        ease: "none",
      }).to(
        secondRow,
        {
          x: "50%",
          duration: 2,
          ease: "none",
        },
        "<"
      );

      componentTimeline = tl;
      return tl;
    };

    createScrollTrigger();

    return () => {
      // Only kill the timeline created by this component
      if (componentTimeline && componentTimeline.scrollTrigger) {
        componentTimeline.scrollTrigger.kill();
        componentTimeline.kill();
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full bg-accent overflow-hidden py-4">
      <div ref={marqueeRef} className="marquee w-full">
        <div
          ref={(el) => {
            if (el) firstRowsRef.current[0] = el;
          }}
          className="marquee__inner flex whitespace-nowrap text-xl lg:text-2xl font-medium  text-primary mb-6 will-change-transform"
          style={{ width: "max-content" }}
        >
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
          <span className="inline-block px-6 select-none">
            Personalized Learning Path
          </span>
        </div>

        <div
          ref={secondRowRef}
          className="marquee__inner flex whitespace-nowrap text-xl lg:text-2xl font-medium  text-primary mb-6 will-change-transform"
          style={{ width: "max-content" }}
        >
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
          <span className="inline-block px-6 select-none">
            Effective Talent Matching
          </span>
        </div>

        <div
          ref={thirdRowRef}
          className="marquee__inner flex whitespace-nowrap text-xl lg:text-2xl font-medium  text-primary will-change-transform"
          style={{ width: "max-content" }}
        >
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
          <span className="inline-block px-6 select-none">
            AI-Powered Career Matching
          </span>
        </div>
      </div>
    </div>
  );
}
