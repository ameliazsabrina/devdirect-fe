"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollReveal from "@/components/scroll-reveal";
import { Linkedin } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const teamMembers = [
  {
    name: "Jean",
    role: "Project Manager",
    image: "/team-placeholder.png",
    linkedin: "https://www.linkedin.com/in/ajengfatmah/",
  },
  {
    name: "Habdil",
    role: "Backend Dev",
    image: "/team-placeholder.png",
    linkedin: "https://www.linkedin.com/in/habdil-iqrawardana/",
  },
  {
    name: "Sabrina",
    role: "Frontend Dev",
    image: "/team-placeholder.png",
    linkedin: "https://www.linkedin.com/in/ameliazakiyasabrina/",
  },
];

export default function Team() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = section.querySelectorAll("[data-team-card]");
    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          opacity: 0,
          y: 60,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "top 60%",
            toggleActions: "play none none reverse",
          },
          delay: index * 0.15,
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="py-16 bg-secondary">
      <div className="max-w-6xl mx-auto px-8">
        <ScrollReveal delay={0}>
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Meet the Team
            </h1>
            <p className="text-lg text-muted-foreground">
              Experts at Building, Development, and Innovation
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              data-team-card
              className="flex flex-col items-center text-center group"
            >
              <div className="relative mb-6 overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  className="w-80 h-96 object-cover"
                  style={{
                    clipPath: "url(#team-clip)",
                  }}
                />

                <div className="absolute top-4 right-4 flex gap-2">
                  <a
                    href={member.linkedin}
                    className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground hover:bg-accent/80 transition-all duration-300 opacity-90 hover:opacity-100"
                  >
                    <Linkedin className="w-4 h-4" />
                  </a>
                </div>

                <div className="absolute bottom-1 left-0 text-left">
                  <h3 className="text-md font-semibold  mb-0.25 ">
                    {member.name}
                  </h3>
                  <p className=" text-xs text-muted-foreground">
                    {member.role}
                  </p>
                </div>

                <svg width="0" height="0">
                  <defs>
                    <clipPath id="team-clip" clipPathUnits="objectBoundingBox">
                      <path d="M0 0.05 L0 0.806 C0 0.833 0.029 0.855 0.065 0.855 L0.288 0.855 C0.324 0.855 0.353 0.877 0.353 0.904 L0.353 0.952 C0.353 0.979 0.382 1 0.418 1 L0.935 1 C0.971 1 1 0.979 1 0.952 L1 0.05 C1 0.023 0.971 0.002 0.935 0.002 L0.065 0.002 C0.029 0.002 0 0.023 0 0.05 Z" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
