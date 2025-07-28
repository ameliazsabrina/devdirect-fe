"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  Eye,
  BarChart3,
  Target,
} from "lucide-react";
import { Header } from "@/components/header";
import SpotlightCard from "@/components/spotlight-card";

const onboardingSteps = [
  {
    id: 1,
    title: "Upload CV",
    description: "Upload your CV untuk analisis otomatis",
    icon: Upload,
    component: "CVUpload",
  },
  {
    id: 2,
    title: "Upload KHS",
    description: "Upload Kartu Hasil Studi (opsional)",
    icon: FileText,
    component: "KHSUpload",
  },
  {
    id: 3,
    title: "Preview Data",
    description: "Review informasi yang telah diekstrak",
    icon: Eye,
    component: "Preview",
  },
  {
    id: 4,
    title: "AI Analysis",
    description: "Analisis skill dan rekomendasi karier",
    icon: BarChart3,
    component: "Analysis",
  },
  {
    id: 5,
    title: "Career Selection",
    description: "Pilih fokus karier yang diinginkan",
    icon: Target,
    component: "CareerSelection",
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const progress = (currentStep / onboardingSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < onboardingSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return <CVUploadStep />;
      case 2:
        return <KHSUploadStep />;
      case 3:
        return <PreviewStep />;
      case 4:
        return <AnalysisStep />;
      case 5:
        return <CareerSelectionStep />;
      default:
        return <CVUploadStep />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="border-b bg-card/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Setup Profil IT Talent
              </h1>
              <p className="text-muted-foreground">
                Lengkapi profil untuk mendapat rekomendasi karier terbaik
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Step {currentStep} of {onboardingSteps.length}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Progress
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
          {onboardingSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all duration-200 min-w-[120px] ${
                    isCurrent
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : isCompleted
                      ? "bg-accent/20 text-accent-foreground hover:bg-accent/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                      isCurrent
                        ? "bg-accent-foreground text-accent"
                        : isCompleted
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-medium text-center">
                    {step.title}
                  </span>
                </button>

                {index < onboardingSteps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <Card className="min-h-[500px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {React.createElement(onboardingSteps[currentStep - 1].icon, {
                className: "w-6 h-6 text-accent",
              })}
              {onboardingSteps[currentStep - 1].title}
            </CardTitle>
            <p className="text-muted-foreground">
              {onboardingSteps[currentStep - 1].description}
            </p>
          </CardHeader>
          <CardContent>{getCurrentStepComponent()}</CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Sebelumnya
          </Button>

          <div className="flex gap-2">
            <Button variant="outline">Simpan Draft</Button>
            <Button
              onClick={handleNext}
              disabled={currentStep === onboardingSteps.length}
              className="flex items-center gap-2"
            >
              {currentStep === onboardingSteps.length
                ? "Selesai"
                : "Selanjutnya"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for each step
function CVUploadStep() {
  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Upload CV Anda
        </h3>
        <p className="text-muted-foreground mb-4">
          Drag & drop file CV atau klik untuk browse
        </p>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Pilih File CV
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Mendukung format PDF, DOC, DOCX (Max 5MB)
        </p>
      </div>
    </div>
  );
}

function KHSUploadStep() {
  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Upload KHS (Opsional)
        </h3>
        <p className="text-muted-foreground mb-4">
          Kartu Hasil Studi untuk analisis akademik yang lebih akurat
        </p>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Pilih File KHS
        </Button>
        <div className="mt-4">
          <Button variant="ghost">Lewati langkah ini</Button>
        </div>
      </div>
    </div>
  );
}

function PreviewStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Preview Data
        </h3>
        <p className="text-muted-foreground">
          Periksa informasi yang berhasil diekstrak dari CV Anda
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-2">
              Informasi Pribadi
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nama:</span>
                <span className="ml-2 text-foreground">John Doe</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2 text-foreground">john@example.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-2">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {["JavaScript", "React", "Node.js", "Python"].map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalysisStep() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          AI Analysis
        </h3>
        <p className="text-muted-foreground">
          Analisis mendalam terhadap skill dan potensi karier Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-3">Skill Analysis</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Frontend Development</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Backend Development</span>
                  <span>70%</span>
                </div>
                <Progress value={70} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium text-foreground mb-3">
              Rekomendasi Karier
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Full Stack Developer</span>
                <span className="text-xs text-accent bg-primary px-2 py-1 rounded-full">
                  90% match
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Frontend Developer</span>
                <span className="text-xs bg-primary text-accent px-2 py-1 rounded-full">
                  85% match
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CareerSelectionStep() {
  const careers = [
    {
      title: "Full Stack Developer",
      match: "90%",
      desc: "Menguasai frontend dan backend",
      isTop: true,
    },
    {
      title: "Frontend Developer",
      match: "85%",
      desc: "Spesialis antarmuka pengguna",
      isTop: false,
    },
    {
      title: "Backend Developer",
      match: "75%",
      desc: "Fokus pada server dan database",
      isTop: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Pilih Fokus Karier
        </h3>
        <p className="text-muted-foreground">
          Pilih jalur karier yang paling sesuai dengan minat dan skill Anda
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {careers.map((career) => {
          if (career.isTop) {
            return (
              <SpotlightCard
                key={career.title}
                className="cursor-pointer transition-all duration-200  border-border hover:border-accent col-span-full bg-card"
                spotlightColor="rgba(217, 254, 133, 0.50)"
              >
                <div className="relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">
                        {career.title}
                      </h4>
                      <span className="text-xs bg-accent text-accent-foreground px-3 py-1 rounded-full font-medium">
                        🎯 Best Match
                      </span>
                    </div>
                    <span className="text-lg font-bold text-accent text-primary">
                      {career.match}
                    </span>
                  </div>
                  <p className="text-muted-foreground mb-4">{career.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">
                      Recommended for you
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div className="w-2 h-2 bg-accent/30 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            );
          }

          return (
            <Card
              key={career.title}
              className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-accent"
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-foreground">
                    {career.title}
                  </h4>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                    {career.match}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{career.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
