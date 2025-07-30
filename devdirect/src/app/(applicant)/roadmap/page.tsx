"use client";

import { useState, useEffect, useRef } from "react";
import RoadmapTitle from "@/components/roadmap-title";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import SplitText from "@/components/ui/split-text";
import { Header } from "@/components/header";

export default function RoadmapPage() {
  const [speed, setSpeed] = useState<"regular" | "half">("regular");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const autoScrollRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [showFirstText, setShowFirstText] = useState(false);
  const [showSecondText, setShowSecondText] = useState(false);
  const [showMainContent, setShowMainContent] = useState(false);

  useEffect(() => {
    setShowFirstText(true);

    const secondTextTimer = setTimeout(() => {
      setShowFirstText(false);
      setShowSecondText(true);
    }, 2000);

    const mainContentTimer = setTimeout(() => {
      setShowFirstText(true);
      setShowMainContent(true);
    }, 5000);

    return () => {
      clearTimeout(secondTextTimer);
      clearTimeout(mainContentTimer);
    };
  }, []);

  useEffect(() => {
    const startAutoScroll = () => {
      if (containerRef.current && isAutoScrolling && showMainContent) {
        const container = containerRef.current;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const scrollSpeed = 0.15;

        const animate = (currentTime: number) => {
          if (!startTimeRef.current) {
            startTimeRef.current = currentTime;
          }

          const elapsed = currentTime - startTimeRef.current;
          const newScrollPosition =
            (elapsed * scrollSpeed) % (maxScroll + 2000); // +2000ms pause

          if (newScrollPosition <= maxScroll && isAutoScrolling) {
            container.scrollLeft = newScrollPosition;
            autoScrollRef.current = requestAnimationFrame(animate);
          } else if (newScrollPosition > maxScroll && isAutoScrolling) {
            container.scrollLeft = maxScroll;
            if (newScrollPosition > maxScroll + 2000) {
              startTimeRef.current = currentTime;
              container.scrollLeft = 0;
            }
            autoScrollRef.current = requestAnimationFrame(animate);
          }
        };

        // Start animation after a brief delay
        setTimeout(() => {
          if (isAutoScrolling) {
            autoScrollRef.current = requestAnimationFrame(animate);
          }
        }, 200);
      }
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
      }
      startTimeRef.current = null;
    };
  }, [isAutoScrolling, showMainContent]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (isAutoScrolling) {
        setIsAutoScrolling(false);
        if (autoScrollRef.current) {
          cancelAnimationFrame(autoScrollRef.current);
        }
        startTimeRef.current = null;
      }

      const target = event.target as Element;
      const isWithinCard = target.closest(".roadmap-card");

      if (isWithinCard && Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        return;
      }

      event.preventDefault();
      if (containerRef.current) {
        const scrollAmount =
          speed === "regular" ? event.deltaY / 2 : event.deltaY;
        containerRef.current.scrollLeft += scrollAmount;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [speed, isAutoScrolling]);

  const learningPlan = [
    {
      week: 1,
      title: "Foundation Setup",
      description:
        "Set up development environment, Git basics, and project structure",
      status: "completed",
    },
    {
      week: 2,
      title: "React Fundamentals",
      description: "Learn JSX, components, props, and state management",
      status: "completed",
    },
    {
      week: 3,
      title: "TypeScript Basics",
      description: "Type annotations, interfaces, and TypeScript with React",
      status: "current",
    },
    {
      week: 4,
      title: "Next.js Introduction",
      description: "App Router, routing, and server components",
      status: "upcoming",
    },
    {
      week: 5,
      title: "Styling & UI",
      description: "Tailwind CSS, component libraries, and responsive design",
      status: "upcoming",
    },
    {
      week: 6,
      title: "State Management",
      description: "Context API, Redux Toolkit, and global state patterns",
      status: "upcoming",
    },
    {
      week: 7,
      title: "API Integration",
      description: "Fetch data, REST APIs, and error handling",
      status: "upcoming",
    },
    {
      week: 8,
      title: "Authentication",
      description: "User login, JWT tokens, and protected routes",
      status: "upcoming",
    },
    {
      week: 9,
      title: "Database Integration",
      description: "SQL basics, ORM setup, and data modeling",
      status: "upcoming",
    },
    {
      week: 10,
      title: "Testing Fundamentals",
      description: "Unit tests, integration tests, and test automation",
      status: "upcoming",
    },
    {
      week: 11,
      title: "Performance Optimization",
      description: "Code splitting, lazy loading, and performance metrics",
      status: "upcoming",
    },
    {
      week: 12,
      title: "Deployment & DevOps",
      description: "CI/CD, hosting platforms, and production deployment",
      status: "upcoming",
    },
  ];

  return (
    <div className="min-h-screen bg-accent m-0 p-0">
      <div className="relative bg-accent h-full m-0 p-0">
        {showMainContent && (
          <div className="mt-4">
            <Header />
          </div>
        )}
        <div
          className={`flex flex-col gap-2 ${
            showMainContent ? "md:pt-16 pt-12" : "min-h-screen justify-center"
          } text-center justify-center items-center px-4 md:px-16`}
        >
          {showFirstText && !showMainContent && (
            <div key="first-text">
              <SplitText
                text="Hey, Habdil!👀"
                className="lg:text-7xl text-4xl font-semibold text-center p-2"
                delay={100}
                duration={0.6}
                ease="elastic.out(1, 0.8)"
                splitType="chars"
                from={{ opacity: 0, y: 40 }}
                to={{ opacity: 1, y: 0 }}
                textAlign="center"
              />
            </div>
          )}
          {showSecondText && !showMainContent && (
            <div key="second-text">
              <SplitText
                text="Untuk menjadi Full Stack Developer, kamu perlu belajar beberapa hal berikut dalam waktu 12 minggu. Semangat ya!💪"
                className="text-lg lg:text-5xl p-2"
                delay={100}
                duration={0.6}
                ease="elastic.out(1, 0.8)"
                splitType="words"
                from={{ opacity: 0, y: 40 }}
                to={{ opacity: 1, y: 0 }}
                textAlign="center"
              />
            </div>
          )}
          {showMainContent && (
            <>
              <h2 className="lg:text-5xl text-2xl font-semibold text-center animate-in fade-in-0 duration-300 md:mt-16">
                Hey, Habdil!
              </h2>
              <p className="text-lg lg:text-3xl text-center animate-in fade-in-0 duration-300">
                Untuk menjadi Full Stack Developer, kamu perlu belajar beberapa
                hal berikut dalam waktu 12 minggu. Semangat ya!💪
              </p>
            </>
          )}
        </div>

        {showMainContent && (
          <>
            <div>
              <div
                ref={containerRef}
                className="overflow-x-auto overflow-y-hidden scrollbar-hide  "
                style={{
                  overscrollBehavior: "none",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                <div className="relative p-16 w-max">
                  <div className="flex items-center gap-16">
                    {learningPlan.map((item, index) => (
                      <div
                        key={item.week}
                        className="relative flex flex-col items-center"
                      >
                        <Card className="roadmap-card w-80 hover:shadow-xl transition-shadow duration-300  max-h-42 overflow-y-hidden bg-transparent border-1 border-primary shadow-none">
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-semibold">
                                Week {item.week}
                              </CardTitle>
                            </div>
                            <CardTitle className="text-lg">
                              {item.title}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="space-y-4">
                            <CardDescription className="text-sm leading-relaxed text-secondary-foreground">
                              {item.description}
                            </CardDescription>
                          </CardContent>
                        </Card>

                        {/* Connecting Line to Next Item */}
                        {index < learningPlan.length - 1 && (
                          <div className="absolute top-1/2 left-full w-16 h-0.5 border-t-1 border-dashed border-primary transform -translate-y-1/2 z-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center items-center">
              <Button
                size="lg"
                className="rounded-full text-lg flex items-center gap-2 hover:scale-105 transition-all duration-300"
              >
                <span>Let's Go!</span>
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
