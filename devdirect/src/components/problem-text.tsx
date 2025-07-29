import React from "react";
import ScrollReveal from "@/components/scroll-reveal";

export default function ProblemText() {
  return (
    <div className="max-w-6xl mx-auto p-8 text-center ">
      <ScrollReveal delay={0}>
        <h2 className="text-4xl lg:text-5xl font-bold mb-8 text-secondary">
          Problem Saat Ini
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={200}>
        <div className="text-lg lg:text-2xl text-secondary leading-relaxed">
          <p>
            Setiap tahun ada{" "}
            <span className="text-accent font-semibold ">
              600 ribu lulusan IT di Indonesia
            </span>{" "}
            , tetapi hanya{" "}
            <span className="text-accent font-semibold">
              2% yang kerja di bidang teknologi.
            </span>{" "}
            Sisanya, lebih dari{" "}
            <span className="text-accent font-semibold">
              588 ribu belum terserap,{" "}
            </span>
            <span className="text-accent font-semibold">
              padahal Indonesia butuh 9 juta talenta IT di 2025-2030.
            </span>
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
