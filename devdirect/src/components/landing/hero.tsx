"use client";
import React from "react";
import Image from "next/image";
import PilotLoading from "@/components/pilot-loading";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/header";
import { toast } from "sonner";

export default function Hero() {
  return (
    <div className="min-h-screen relative overflow-hidden" id="hero">
      <Header />
      <div className="relative z-10 min-h-screen flex">
        <div className="flex-1 p-8 lg:p-16 flex flex-col justify-between">
          <div className="space-y-8">
            <h1 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight animate-slide-in-left-up">
              Temukan Karier
              <br />
              IT Talent Impianmu
            </h1>

            {/* Statistics from left */}
            <div className="space-y-4 animate-slide-in-left animation-delay-200">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2  p-4 bg-accent rounded-full">
                  <span className="text-3xl lg:text-4xl font-bold text-secondary-foreground">
                    500+
                  </span>
                  <span className="text-sm lg:text-base text-muted-foreground">
                    IT Talent Terkoneksi
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2  p-4 bg-accent rounded-full">
                  <span className="text-3xl lg:text-4xl font-bold text-secondary-foreground">
                    300+
                  </span>
                  <span className="text-sm lg:text-base text-muted-foreground">
                    Perusahaan Membuka Lowongan
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2  p-4 bg-accent rounded-full">
                  <span className="text-3xl lg:text-4xl font-bold text-secondary-foreground">
                    24/7
                  </span>
                  <span className="text-sm lg:text-base text-muted-foreground">
                    Pencocokan Berbasis AI
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Company info from left down */}
          <div className="flex items-center space-x-4 animate-slide-in-left-down animation-delay-600">
            <Image
              src="/logo.svg"
              alt="Logo DevDirect"
              width={32}
              height={32}
            />

            <div>
              <div className="font-semibold text-foreground">DevDirect</div>
              <div className="text-sm text-muted-foreground">
                Based in Yogyakarta, Indonesia
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 lg:p-16 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Description p from right up */}
            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed animate-slide-in-right-up animation-delay-300">
              Lagi cari jalan karier atau talent yang cocok? DevDirect pakai AI
              buat nyocokin IT Talent hebat dengan tim yang butuh mereka.
              <br />
              <span className="font-semibold">Simple, cepat, tepat.</span>
            </p>

            {/* Pilot loading from right */}
            <div className="flex justify-end text-accent animate-slide-in-right animation-delay-400">
              <PilotLoading />
            </div>
          </div>

          {/* Button from right down */}
          <div className="flex justify-end animate-slide-in-right-down animation-delay-700">
            <Button
              variant="secondary"
              size="lg"
              className="text-xl hover:scale-105 transition-transform duration-200 rounded-full px-8 py-4"
              onClick={() => {
                toast.success("Test Toast!", {
                  description: "This is a test to see if toasts work",
                });
              }}
            >
              Mulai Perjalananmu <ArrowUpRight className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* Image from right */}
      <div className="absolute bottom-8 right-0 z-0 animate-slide-in-right animation-delay-500">
        <div className="relative">
          <Image
            src="/hero-pic.png"
            alt="Ruang Kerja IT Talent"
            width={900}
            height={450}
            className="object-cover rounded-2xl mb-24"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
