"use client";
import React, { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Github, Twitter, Linkedin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

gsap.registerPlugin(ScrollTrigger);

export default function CTA() {
  const ctaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Store component-specific trigger for proper cleanup
    let componentTrigger: ScrollTrigger | null = null;

    const animation = gsap.fromTo(
      container,
      {
        scale: 0.8,
        opacity: 0.7,
      },
      {
        scale: 1,
        opacity: 1,
        duration: 1.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: container,
          start: "top 90%",
          end: "top 40%",
          scrub: 1,
          toggleActions: "play none none reverse",
        },
      }
    );

    componentTrigger = animation.scrollTrigger;

    return () => {
      // Only kill trigger created by this component
      if (componentTrigger) {
        componentTrigger.kill();
      }
    };
  }, []);

  return (
    <div
      ref={ctaRef}
      className="min-h-[50vh] flex items-end justify-center bg-background pt-16"
      id="contact"
    >
      <div
        ref={containerRef}
        className="container bg-accent max-w-6xl lg:max-w-7xl mx-auto rounded-t-2xl overflow-hidden shadow-lg"
      >
        <div className="px-8 lg:px-12 py-16 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-accent-foreground mb-6 leading-tight">
            Siap Menjadi IT Talent Company Impianmu?
          </h1>
          <p className="text-lg lg:text-xl text-accent-foreground/80 mb-8 max-w-2xl mx-auto">
            Jadilah bagian dari komunitas IT Talent yang dengan DevDirect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="#hero">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 rounded-full px-8 py-6 text-lg font-semibold hover:scale-105 transition-all duration-300"
              >
                Mulai Sekarang
                <ArrowUpRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        <Separator className="bg-accent-foreground/20" />
        <div className="px-8 lg:px-12 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo.svg" alt="DevDirect" width={32} height={32} />
                <span className="text-xl font-bold text-accent-foreground">
                  DevDirect
                </span>
              </div>
              <p className="text-accent-foreground/70 text-sm leading-relaxed max-w-md">
                AI-powered platform connecting talented IT Talents with their
                perfect career opportunities. Join the future of tech
                recruitment.
              </p>
              <div className="flex items-center gap-4 mt-6">
                <Link
                  href="#"
                  className="w-10 h-10 bg-accent-foreground/10 hover:bg-accent-foreground/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <Linkedin className="w-4 h-4 text-accent-foreground" />
                </Link>
                <Link
                  href="#"
                  className="w-10 h-10 bg-accent-foreground/10 hover:bg-accent-foreground/20 rounded-full flex items-center justify-center transition-colors"
                >
                  <Github className="w-4 h-4 text-accent-foreground" />
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-accent-foreground font-semibold mb-4">
                Platform
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    For IT Talents
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    For Recruiters
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    How It Works
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-accent-foreground font-semibold mb-4">
                Support
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-accent-foreground/70 hover:text-accent-foreground transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="bg-accent-foreground/20 mb-6" />
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-accent-foreground/60">
              © 2025 DevDirect. All rights reserved.
            </p>
            <p className="text-sm text-accent-foreground/60">
              Made with ❤️ for the IT Talent community
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
