"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Loader2,
} from "lucide-react";
import { type LatestAnalysisData } from "@/lib/api";

interface AnalysisStepProps {
  analysisData: LatestAnalysisData | null;
  isAnalyzing: boolean;
}

export function AnalysisStep({ analysisData, isAnalyzing }: AnalysisStepProps) {
  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            AI Analysis
          </h3>
          <p className="text-muted-foreground">
            Menganalisis skill dan potensi karier Anda...
          </p>
        </div>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              Memproses Analisis...
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              AI sedang menganalisis CV, KHS, dan data pasar untuk memberikan
              rekomendasi terbaik
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    Menganalisis skill dari CV
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Teknologi dan keahlian
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    Menganalisis performa akademik
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Nilai dan mata kuliah relevan
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    Mencocokkan dengan data pasar
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Demand industri dan peluang karier
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Proses ini biasanya memakan waktu 30-60 detik...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            AI Analysis
          </h3>
          <p className="text-muted-foreground">
            Analisis belum tersedia. Kembali ke langkah sebelumnya untuk memulai
            analisis.
          </p>
        </div>
      </div>
    );
  }

  const { analysis, summary, confidence_level, analyzed_at, data_sources } =
    analysisData;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Hasil Analisis AI
        </h3>
        <p className="text-muted-foreground">
          Analisis mendalam terhadap skill dan potensi karier Anda
        </p>
      </div>

      <Card className="bg-gradient-to-l from-accent/10 to-accent/20 border-accent/40">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-foreground text-lg">
              Ringkasan Analisis
            </h4>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                confidence_level === "High"
                  ? "bg-green-100 text-green-800"
                  : confidence_level === "Medium"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              Confidence: {confidence_level}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {summary.top_skill_score}
              </div>
              <div className="text-sm text-muted-foreground">
                Top Skill Score
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {summary.skills_found}
              </div>
              <div className="text-sm text-muted-foreground">Skills Found</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {summary.top_skill_domain}
              </div>
              <div className="text-sm text-muted-foreground">Top Domain</div>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Dianalisis pada: {new Date(analyzed_at).toLocaleString("id-ID")} •
            Data sources: {data_sources?.join(", ") || "N/A"}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h4 className="font-semibold text-foreground text-lg">
          Analisis Kekuatan Skill
        </h4>
        {analysis.skill_strengths && analysis.skill_strengths.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {analysis.skill_strengths.map((skill, index) => (
              <Card
                key={skill.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h5 className="font-semibold text-foreground text-lg mb-2">
                        {skill.skill_domain}
                      </h5>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Strength:
                          </span>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={skill.strength_score}
                              className="h-2 w-20"
                            />
                            <span className="font-semibold text-primary">
                              {skill.strength_score}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Market Demand:
                          </span>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={skill.market_demand}
                              className="h-2 w-20"
                            />
                            <span className="font-semibold text-accent-foreground">
                              {skill.market_demand}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="inline-block px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm font-medium mb-4">
                        {skill.career_potential}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h6 className="font-medium text-foreground mb-2">
                        Evidence
                      </h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {skill.evidence.cv_skills?.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              CV Skills:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {skill.evidence.cv_skills?.map((cvSkill, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                                >
                                  {cvSkill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {skill.evidence.projects?.length > 0 && (
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">
                              Projects:
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {skill.evidence.projects?.map((project, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-accent/10 text-accent-foreground rounded text-xs"
                                >
                                  {project}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {skill.evidence.relevant_courses?.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            Relevant Courses:
                          </span>
                          <div className="mt-2 space-y-2">
                            {skill.evidence.relevant_courses?.map(
                              (course, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-muted/30 rounded"
                                >
                                  <div>
                                    <span className="text-sm font-medium">
                                      {course.course_code}
                                    </span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      {course.course_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">
                                      {course.grade}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      ({course.grade_point})
                                    </span>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                      {course.relevance_score}% relevant
                                    </span>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {skill.evidence.certificates?.length > 0 && (
                        <div className="mt-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            Certificates:
                          </span>
                          <div className="mt-2 space-y-2">
                            {skill.evidence.certificates?.map((cert, idx) => (
                              <div
                                key={idx}
                                className="p-2 bg-green-50 border border-green-200 rounded"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="text-sm font-medium">
                                      {cert.name}
                                    </span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                      by {cert.issuer}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs px-2 py-1 rounded ${
                                        cert.is_active
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {cert.is_active ? "Active" : "Expired"}
                                    </span>
                                    <span className="text-xs text-green-700 font-medium">
                                      {cert.credibility_weight}% credibility
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {cert.skills?.map((certSkill, skillIdx) => (
                                    <span
                                      key={skillIdx}
                                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                                    >
                                      {certSkill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <span className="text-sm text-muted-foreground">
                          Grade Average:{" "}
                        </span>
                        <span className="text-sm font-semibold">
                          {skill.evidence.grade_average?.toFixed(2) || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h6 className="font-medium text-foreground mb-2">
                        Recommendations
                      </h6>
                      <ul className="space-y-1">
                        {skill.recommendations?.map((rec, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary mt-1">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                No skill analysis data available.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}