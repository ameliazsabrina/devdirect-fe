import Hero from "@/components/landing/hero";
import Problem from "@/components/landing/problem";
import About from "@/components/landing/about";
import Info from "@/components/landing/info";
import ApplicantFlow from "@/components/webflow";
import Team from "@/components/landing/team";
import CTA from "@/components/landing/cta";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <About />
      <Info />
      <ApplicantFlow />
      <Team />
      <CTA />
    </>
  );
}
