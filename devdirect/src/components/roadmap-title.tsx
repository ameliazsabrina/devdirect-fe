import CurvedLoop from "@/components/ui/curved-loop";

export default function RoadmapTitle() {
  return (
    <CurvedLoop
      marqueeText="Your Personalized Roadmap Your Personalized Roadmap Your Personalized Roadmap Your Personalized Roadmap Your Personalized Roadmap Your Personalized Roadmap"
      speed={1.5}
      curveAmount={70}
      direction="left"
      interactive={true}
      className=" text-4xl lg:text-3xl font-light text-primary"
    />
  );
}
