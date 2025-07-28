"use client";
import React, { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import ScrollReveal from "@/components/scroll-reveal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UserPlus,
  Target,
  Zap,
  MousePointerClick,
  TrendingUp,
  Briefcase,
  Filter,
  Eye,
  Calendar,
  Handshake,
  Code,
  Users,
} from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const developerSteps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Buat Profil",
    description:
      "Daftar dan unggah CV kamu. AI kami akan otomatis menganalisis data kamu.",
  },
  {
    number: 2,
    icon: Target,
    title: "Tes Kemampuan",
    description:
      "Selesaikan tantangan coding interaktif untuk menunjukkan keahlianmu.",
  },
  {
    number: 3,
    icon: Zap,
    title: "Rekomendasi AI",
    description:
      "Dapatkan rekomendasi pekerjaan yang cocok dengan akurasi 80%+.",
  },
  {
    number: 4,
    icon: MousePointerClick,
    title: "Lamar Sekali Klik",
    description:
      "Lamar ke berbagai posisi sekaligus dengan profil yang sudah dioptimalkan.",
  },
  {
    number: 5,
    icon: TrendingUp,
    title: "Pantau & Berkembang",
    description:
      "Pantau lamaran dan tingkatkan skill dengan panduan belajar yang personal.",
  },
];

const recruiterSteps = [
  {
    number: 1,
    icon: Briefcase,
    title: "Pasang Lowongan",
    description:
      "Buat detail lowongan dengan kriteria skill dan preferensi yang dibutuhkan.",
  },
  {
    number: 2,
    icon: Filter,
    title: "Filter Pintar",
    description:
      "Gunakan filter berbasis AI untuk menemukan kandidat yang paling cocok.",
  },
  {
    number: 3,
    icon: Eye,
    title: "Review Kandidat",
    description:
      "Lihat profil kandidat lengkap dengan hasil tes skill dan portfolio.",
  },
  {
    number: 4,
    icon: Calendar,
    title: "Atur Interview",
    description: "Kelola proses rekrutmen dari aplikasi hingga penawaran.",
  },
  {
    number: 5,
    icon: Handshake,
    title: "Beri Penawaran",
    description: "Kirim penawaran dan pantau respons melalui dashboard.",
  },
];

export default function Webflow() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = section.querySelectorAll("[data-card]");
    cards.forEach((card, index) => {
      gsap.fromTo(
        card,
        {
          opacity: 0,
          y: 50,
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "top 65%",
            toggleActions: "play none none reverse",
          },
          delay: index * 0.1,
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const StepCard = ({
    step,
  }: {
    step: (typeof developerSteps)[0];
    index: number;
  }) => {
    const Icon = step.icon;
    return (
      <Card
        data-card
        className="relative bg-card hover:shadow-lg transition-all duration-300 hover:scale-105 border-border"
      >
        <div className="absolute -top-3 left-6 w-8 h-8 bg-accent rounded-full flex items-center justify-center text-accent-foreground font-semibold text-sm z-10">
          {step.number}
        </div>
        <CardHeader className="pb-4">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-accent-foreground" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">
            {step.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-muted-foreground leading-relaxed">
            {step.description}
          </CardDescription>
        </CardContent>
      </Card>
    );
  };

  return (
    <section ref={sectionRef} className="py-16 bg-background">
      <div className="max-w-6xl mx-auto px-8">
        <ScrollReveal delay={0}>
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Cara Kerja DevDirect
            </h1>
            <p className="text-lg text-muted-foreground">
              Langkah mudah menghubungkan developer dengan peluang karier
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <Tabs defaultValue="developer" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger
                value="developer"
                className="flex items-center gap-2"
              >
                <Code className="w-4 h-4" />
                Untuk Developer
              </TabsTrigger>
              <TabsTrigger
                value="recruiter"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Untuk Recruiter
              </TabsTrigger>
            </TabsList>

            <TabsContent value="developer">
              <div className="text-center mb-8">
                <h2 className="text-2xl lg:text-3xl font-semibold text-foreground mb-2">
                  Alur Developer
                </h2>
                <p className="text-muted-foreground">
                  Dari membuat profil hingga mendapat pekerjaan impian
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {developerSteps.map((step, index) => (
                  <StepCard key={step.number} step={step} index={index} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recruiter">
              <div className="text-center mb-8">
                <h2 className="text-2xl lg:text-3xl font-semibold text-foreground mb-2">
                  Alur Recruiter
                </h2>
                <p className="text-muted-foreground">
                  Dari pasang lowongan hingga dapat kandidat terbaik
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                {recruiterSteps.map((step, index) => (
                  <StepCard key={step.number} step={step} index={index} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollReveal>
      </div>
    </section>
  );
}
