"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, CheckCircle2, Loader2 } from "lucide-react";
import SpotlightCard from "@/components/spotlight-card";
import { competencyAPI, type LatestAnalysisData } from "@/lib/api";
import { toast } from "sonner";

interface CareerSelectionStepProps {
  analysisData: LatestAnalysisData | null;
}

export function CareerSelectionStep({
  analysisData,
}: CareerSelectionStepProps) {
  const [selectedCareer, setSelectedCareer] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [currentAnalysisData, setCurrentAnalysisData] =
    useState<LatestAnalysisData | null>(analysisData);

  React.useEffect(() => {
    const fetchLatestAnalysis = async () => {
      if (!currentAnalysisData) {
        setIsLoadingAnalysis(true);
        try {
          const response = await competencyAPI.getLatestAnalysis();
          if (response.status === "success" && response.data) {
            setCurrentAnalysisData(response.data);
          } else {
            console.log("No analysis data available for career selection");
          }
        } catch (error) {
          console.error("Error fetching analysis for career selection:", error);
        } finally {
          setIsLoadingAnalysis(false);
        }
      }
    };

    fetchLatestAnalysis();
  }, [currentAnalysisData]);

  const handleCareerSelect = (careerTitle: string) => {
    setSelectedCareer(careerTitle);
    toast.success("Career path selected!", {
      description: `You selected: ${careerTitle}`,
    });
  };

  const generateCareerOptions = () => {
    if (!currentAnalysisData?.analysis?.skill_strengths) {
      return [
        {
          title: "Full Stack Developer",
          match: "85%",
          desc: "Menguasai frontend dan backend development",
          isTop: true,
          skills: ["JavaScript", "React", "Node.js", "Database"],
        },
        {
          title: "Frontend Developer",
          match: "80%",
          desc: "Spesialis antarmuka pengguna dan user experience",
          isTop: false,
          skills: ["React", "TypeScript", "CSS", "UI/UX"],
        },
        {
          title: "Backend Developer",
          match: "75%",
          desc: "Fokus pada server-side development dan API",
          isTop: false,
          skills: ["Node.js", "Database", "API", "System Design"],
        },
      ];
    }

    const skillStrengths = currentAnalysisData.analysis.skill_strengths;

    const sortedSkills = [...skillStrengths].sort(
      (a, b) => b.strength_score - a.strength_score
    );

    const careerOptions = sortedSkills.map((skill, index) => {
      const isTop = index === 0;

      return {
        title: skill.skill_domain,
        match: `${Math.round(skill.strength_score)}%`,
        desc:
          skill.recommendations && skill.recommendations.length > 0
            ? skill.recommendations[0]
            : `Strong potential in ${skill.skill_domain} based on your skills and market demand`,
        isTop: isTop,
        skills: skill.evidence?.cv_skills?.slice(0, 4) || [skill.skill_domain],
        isAnalysisBased: true,
        marketDemand: skill.market_demand,
        strengthScore: skill.strength_score,
        recommendations: skill.recommendations,
      };
    });

    return careerOptions.slice(0, 3);
  };

  const careers = generateCareerOptions();

  if (isLoadingAnalysis) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Pilih Fokus Karir
          </h3>
          <p className="text-muted-foreground">
            Memuat data analisis untuk rekomendasi karir yang disesuaikan...
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Mengambil analisis keterampilan Anda...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Pilih Fokus Karir
        </h3>
        <p className="text-muted-foreground">
          Pilih jalur karir yang paling sesuai dengan analisis keterampilan dan
          minat Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {careers.map((career) => {
          const isSelected = selectedCareer === career.title;

          if (career.isTop) {
            return (
              <div
                key={career.title}
                className="col-span-full cursor-pointer"
                onClick={() => handleCareerSelect(career.title)}
              >
                <SpotlightCard
                  className={`transition-all duration-200 bg-card ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-accent"
                  }`}
                  spotlightColor="rgba(217, 254, 133, 0.50)"
                >
                  <div className="relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {career.title}
                        </h4>

                        {isSelected && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">
                            ✓ Selected
                          </span>
                        )}
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {career.match}
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-4">{career.desc}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {career.skills?.map((skill, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            );
          }

          return (
            <Card
              key={career.title}
              className={`cursor-pointer hover:shadow-md transition-all duration-200 border-2 ${
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-accent"
              }`}
              onClick={() => handleCareerSelect(career.title)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-foreground">
                      {career.title}
                    </h4>
                    {isSelected && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    {career.match}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {career.desc}
                </p>
                {career.skills && (
                  <div className="flex flex-wrap gap-1">
                    {career.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-accent/10 text-accent-foreground px-2 py-1 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedCareer && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Karir Dipilih</h4>
                <p className="text-sm text-green-800">
                  Anda telah memilih <strong>{selectedCareer}</strong> sebagai
                  jalur karier Anda. Ini akan membantu kami memberikan
                  rekomendasi dan peluang yang lebih tepat.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
