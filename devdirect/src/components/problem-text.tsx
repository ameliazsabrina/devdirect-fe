import React from "react";
import ScrollReveal from "@/components/scroll-reveal";

export default function ProblemText() {
  return (
    <div className="max-w-6xl mx-auto p-8 text-center ">
      <ScrollReveal delay={0}>
        <h2 className="text-4xl lg:text-5xl font-bold mb-8">
          Problem Saat Ini
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <div className="text-lg lg:text-2xl text-muted-foreground leading-relaxed">
          <p>
            Setiap tahun ada{" "}
            <span className="text-accent bg-primary px-2 py-1 rounded-full ">
              600 ribu lulusan IT di Indonesia
            </span>{" "}
            , tetapi hanya{" "}
            <span className="text-accent bg-primary px-2 py-1 rounded-full">
              2% yang kerja di bidang teknologi.
            </span>{" "}
            Sisanya, lebih dari{" "}
            <span className="text-accent bg-primary px-2 py-1 rounded-full">
              588 ribu belum terserap,{" "}
            </span>
            <span className="text-accent bg-primary px-2 py-1 rounded-full font-semibold">
              padahal Indonesia butuh 9 juta talenta IT di 2025-2030.
            </span>
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
