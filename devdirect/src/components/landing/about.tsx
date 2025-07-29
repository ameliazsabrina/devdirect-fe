"use client";
import React, { useEffect, useRef } from "react";
import Image from "next/image";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const clipContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const clipContainer = clipContainerRef.current;
    const image = imageRef.current;
    const tag = tagRef.current;
    const title = titleRef.current;
    const description = descriptionRef.current;

    if (!section || !clipContainer || !image || !tag || !title || !description)
      return;

    // Store component-specific triggers for proper cleanup
    const triggers: ScrollTrigger[] = [];

    const imageAnimation = gsap.fromTo(
      image,
      { y: -100 },
      {
        y: 100,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          scrub: 2,
        },
      }
    );

    if (imageAnimation.scrollTrigger) {
      triggers.push(imageAnimation.scrollTrigger);
    }

    const textElements = [tag, title, description];

    textElements.forEach((element, index) => {
      const textAnimation = gsap.fromTo(
        element,
        {
          opacity: 0.6,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: element,
            start: "top 80%",
            end: "top 50%",
            toggleActions: "play none none reverse",
          },
          delay: index * 0.1,
        }
      );

      if (textAnimation.scrollTrigger) {
        triggers.push(textAnimation.scrollTrigger);
      }
    });

    return () => {
      // Only kill triggers created by this component
      triggers.forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen overflow-hidden"
      id="about"
    >
      {/* Mobile Layout: Stack text above image */}
      <div className="lg:hidden flex flex-col p-4 sm:p-8 space-y-8">
        {/* Text Content */}
        <div className="space-y-6">
          <p
            ref={tagRef}
            className="text-accent font-medium text-sm bg-primary px-4 py-2 rounded-full w-fit opacity-60"
          >
            DevDirect's Approach
          </p>

          <h3
            ref={titleRef}
            className="text-2xl sm:text-3xl font-bold text-foreground leading-tight opacity-60"
          >
            Solusi Cerdas untuk
            <br />
            Karier IT Talent
          </h3>

          <p
            ref={descriptionRef}
            className="text-base sm:text-lg text-muted-foreground leading-relaxed opacity-60"
          >
            DevDirect mengatasi masalah gap skill dan kesulitan matching antara
            IT Talent dan perusahaan melalui platform AI yang menganalisis
            kemampuan setiap IT Talent secara mendalam, memberikan rekomendasi
            pembelajaran yang personal, dan mencocokkan mereka dengan perusahaan
            yang tepat berdasarkan skill dan minat.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
            <svg className="absolute inset-0 w-0 h-0">
              <defs>
                <clipPath
                  id="custom-clip-mobile"
                  clipPathUnits="objectBoundingBox"
                >
                  <path d="M1 0.533 C1 0.566 0.972 0.594 0.938 0.594 H0.552 C0.518 0.594 0.490 0.621 0.490 0.655 V0.938 C0.490 0.972 0.462 1 0.428 1 H0.062 C0.028 1 0 0.972 0 0.938 V0.577 C0 0.543 0.028 0.515 0.062 0.515 H0.337 C0.371 0.515 0.399 0.488 0.399 0.454 V0.061 C0.399 0.027 0.427 0 0.461 0 H0.938 C0.972 0 1 0.027 1 0.061 V0.533 Z" />
                </clipPath>
              </defs>
            </svg>

            <div
              className="w-full h-full overflow-hidden"
              style={{
                clipPath: "url(#custom-clip-mobile)",
              }}
            >
              <Image
                src="/clip-image.jpg"
                alt="IT Talent working"
                fill
                className="object-cover"
                sizes="(max-width: 640px) 280px, 320px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout: Side by side (unchanged) */}
      <div className="hidden lg:block">
        <div className="relative z-10 w-full md:w-3/5 lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center min-h-screen">
          <div className="space-y-8">
            <p
              ref={tagRef}
              className="text-accent font-medium text-sm bg-primary px-4 py-2 rounded-full w-fit opacity-60"
            >
              DevDirect's Approach
            </p>

            <h3
              ref={titleRef}
              className="text-3xl lg:text-5xl font-bold text-foreground leading-tight opacity-60"
            >
              Solusi Cerdas untuk
              <br />
              Karier IT Talent
            </h3>

            <p
              ref={descriptionRef}
              className="text-lg lg:text-xl text-muted-foreground leading-relaxed opacity-60"
            >
              DevDirect mengatasi masalah gap skill dan kesulitan matching
              antara IT Talent dan perusahaan melalui platform AI yang
              menganalisis kemampuan setiap IT Talent secara mendalam,
              memberikan rekomendasi pembelajaran yang personal, dan mencocokkan
              mereka dengan perusahaan yang tepat berdasarkan skill dan minat.
            </p>
          </div>
        </div>

        <div
          ref={clipContainerRef}
          className="absolute top-1/2 right-0 transform -translate-y-1/2 z-0 p-8 lg:p-16"
        >
          <div className="relative w-[500px] h-[500px] lg:w-[600px] lg:h-[600px]">
            <svg className="absolute inset-0 w-0 h-0">
              <defs>
                <clipPath id="custom-clip" clipPathUnits="objectBoundingBox">
                  <path d="M1 0.533 C1 0.566 0.972 0.594 0.938 0.594 H0.552 C0.518 0.594 0.490 0.621 0.490 0.655 V0.938 C0.490 0.972 0.462 1 0.428 1 H0.062 C0.028 1 0 0.972 0 0.938 V0.577 C0 0.543 0.028 0.515 0.062 0.515 H0.337 C0.371 0.515 0.399 0.488 0.399 0.454 V0.061 C0.399 0.027 0.427 0 0.461 0 H0.938 C0.972 0 1 0.027 1 0.061 V0.533 Z" />
                </clipPath>
              </defs>
            </svg>

            <div
              ref={imageRef}
              className="w-full h-full overflow-hidden"
              style={{
                clipPath: "url(#custom-clip)",
              }}
            >
              <Image
                src="/clip-image.jpg"
                alt="IT Talent working"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 500px, 600px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
