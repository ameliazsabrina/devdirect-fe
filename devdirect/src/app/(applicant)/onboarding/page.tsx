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
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Header } from "@/components/header";
import {
  CVUploadStep,
  KHSUploadStep,
  PreviewStep,
  AnalysisStep,
  CareerSelectionStep,
} from "@/components/applicant/onboarding";
import {
  sessionAPI,
  competencyAPI,
  type ParsedCV,
  type CVData,
  type KHSData,
  type SessionData,
  type LatestAnalysisData,
  getStoredAuthToken,
  testTokenValidity,
  getTokenInfo,
} from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
    description: "Upload Kartu Hasil Studi",
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
  const [currentStep, setCurrentStep] = useState(0);
  const [showPreparation, setShowPreparation] = useState(true);
  const router = useRouter();

  const [uploadedCVFile, setUploadedCVFile] = useState<File | null>(null);
  const [parsedCVData, setParsedCVData] = useState<ParsedCV | null>(null);
  const [completeCVData, setCompleteCVData] = useState<CVData | null>(null);
  const [uploadedKHSFile, setUploadedKHSFile] = useState<File | null>(null);
  const [khsData, setKhsData] = useState<KHSData | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [analysisData, setAnalysisData] = useState<LatestAnalysisData | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Function to save session data to Redis (gracefully handles missing endpoints)
  const saveSessionData = async () => {
    try {
      const sessionData: SessionData = {
        cvData: completeCVData,
        khsData: khsData,
        uploadedCVFile: uploadedCVFile
          ? {
              name: uploadedCVFile.name,
              size: uploadedCVFile.size,
              type: uploadedCVFile.type,
              lastModified: uploadedCVFile.lastModified,
            }
          : null,
        uploadedKHSFile: uploadedKHSFile
          ? {
              name: uploadedKHSFile.name,
              size: uploadedKHSFile.size,
              type: uploadedKHSFile.type,
              lastModified: uploadedKHSFile.lastModified,
            }
          : null,
        parsedCVData: parsedCVData,
        consentGiven: consentGiven,
        currentStep: currentStep,
        analysisData: analysisData,
      };

      const response = await sessionAPI.saveSession(sessionData);
      if (response.status === "success") {
        console.log(
          "✅ Session data saved:",
          response.message?.includes("local state")
            ? "Using local state (Redis not available)"
            : "Saved to Redis"
        );
      } else {
        console.warn("⚠️ Session save warning:", response.message);
      }
    } catch (error) {
      // This shouldn't happen now since sessionAPI handles 404s gracefully
      console.warn("⚠️ Session save error (continuing without Redis):", error);
    }
  };

  // Function to restore session data from Redis
  const restoreSessionData = async () => {
    try {
      const response = await sessionAPI.getSession();

      // Check if this is a "not implemented" response
      if (
        response.status === "success" &&
        response.message?.includes("not implemented")
      ) {
        console.log(
          "Redis session system not yet implemented on backend - using local state only"
        );
        // Don't show error to user, this is expected during development
        return;
      }

      if (response.status === "success" && response.data) {
        const sessionData = response.data;

        // Restore state from session
        if (sessionData.cvData) {
          setCompleteCVData(sessionData.cvData);
        }
        if (sessionData.khsData) {
          setKhsData(sessionData.khsData);
        }
        if (sessionData.parsedCVData) {
          setParsedCVData(sessionData.parsedCVData);
        }
        if (sessionData.consentGiven !== undefined) {
          setConsentGiven(sessionData.consentGiven);
        }
        if (sessionData.analysisData) {
          setAnalysisData(sessionData.analysisData);
        }
        if (sessionData.currentStep && sessionData.currentStep > 0) {
          setCurrentStep(sessionData.currentStep);
          setShowPreparation(false);
        }

        // Note: File objects cannot be serialized, so we can't restore actual File objects
        // We can only show that files were previously uploaded
        if (sessionData.uploadedCVFile) {
          console.log(
            "CV file was previously uploaded:",
            sessionData.uploadedCVFile.name
          );
          toast.info("Session Restored", {
            description: `Previous CV file: ${sessionData.uploadedCVFile.name}`,
          });
        }
        if (sessionData.uploadedKHSFile) {
          console.log(
            "KHS file was previously uploaded:",
            sessionData.uploadedKHSFile.name
          );
          toast.info("Session Restored", {
            description: `Previous KHS file: ${sessionData.uploadedKHSFile.name}`,
          });
        }

        console.log("Session data restored successfully");
      } else {
        console.log(
          "No session data found, session expired, or Redis endpoints not implemented yet"
        );
      }
    } catch (error) {
      console.error("Error restoring session data:", error);
    }
  };

  React.useEffect(() => {
    const validateTokenOnLoad = async () => {
      console.log("Validating token on page load...");
      const isValid = await testTokenValidity();

      if (!isValid) {
        console.log("Token validation failed on page load");
        toast.error("Authentication Required", {
          description: "Please login to access this page.",
        });
        router.push("/");
      } else {
        console.log("Token validation successful on page load");

        // Restore session data after successful token validation
        await restoreSessionData();
      }
    };

    validateTokenOnLoad();
  }, [router]);

  // Auto-save session data whenever important state changes
  React.useEffect(() => {
    // Only save if we have valid data and user is authenticated
    if (
      getStoredAuthToken() &&
      (completeCVData || khsData || parsedCVData || currentStep > 0)
    ) {
      const debounceTimer = setTimeout(() => {
        saveSessionData();
      }, 1000); // Debounce saves to avoid too frequent API calls

      return () => clearTimeout(debounceTimer);
    }
  }, [
    completeCVData,
    khsData,
    parsedCVData,
    consentGiven,
    currentStep,
    uploadedCVFile,
    uploadedKHSFile,
    analysisData,
  ]);

  const progress = showPreparation
    ? 0
    : (currentStep / onboardingSteps.length) * 100;

  const handleNext = async () => {
    if (showPreparation) {
      setShowPreparation(false);
      setCurrentStep(1);
    } else if (currentStep < onboardingSteps.length) {
      // Check if moving from Preview (step 3) to Analysis (step 4)
      if (currentStep === 3) {
        setIsAnalyzing(true);
        toast.info("Analyzing your skills...", {
          description: "This may take a few moments. Please wait.",
        });

        try {
          // Trigger competency analysis
          const analysisResponse = await competencyAPI.analyzeSkills();

          if (analysisResponse.status === "success") {
            // Get the latest analysis data
            const latestResponse = await competencyAPI.getLatestAnalysis();

            if (latestResponse.status === "success" && latestResponse.data) {
              setAnalysisData(latestResponse.data);
              toast.success("Analysis completed!", {
                description: "Your skill analysis is ready to review.",
              });
              setCurrentStep(currentStep + 1);
            } else {
              toast.error("Failed to retrieve analysis", {
                description:
                  latestResponse.message || "Could not load analysis results.",
              });
            }
          } else {
            // Handle analysis failure
            if (analysisResponse.message?.includes("Authentication expired")) {
              toast.error("Session expired", {
                description: "Please login again to continue.",
              });
              router.push("/");
              return;
            }

            toast.error("Analysis failed", {
              description:
                analysisResponse.message ||
                "Could not analyze your skills. Please try again.",
            });
          }
        } catch (error) {
          console.error("Error during skill analysis:", error);
          toast.error("Analysis error", {
            description: "An unexpected error occurred during analysis.",
          });
        } finally {
          setIsAnalyzing(false);
        }
      } else {
        // Normal step progression
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Onboarding completed, clear session data
      try {
        await sessionAPI.clearSession();
        console.log("Onboarding completed, session data cleared");
        toast.success("Onboarding completed!", {
          description: "Redirecting to dashboard...",
        });
        // Redirect to dashboard or next page
        router.push("/dashboard");
      } catch (error) {
        console.error("Error clearing session on completion:", error);
        // Still redirect even if clearing fails
        router.push("/dashboard");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else if (currentStep === 1) {
      setShowPreparation(true);
      setCurrentStep(0);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (!showPreparation) {
      setCurrentStep(stepId);
    }
  };

  const handleStartOnboarding = () => {
    setShowPreparation(false);
    setCurrentStep(1);
  };

  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CVUploadStep
            uploadedFile={uploadedCVFile}
            setUploadedFile={setUploadedCVFile}
            parsedCV={parsedCVData}
            setParsedCV={setParsedCVData}
            cvData={completeCVData}
            setCVData={setCompleteCVData}
          />
        );
      case 2:
        return (
          <KHSUploadStep
            uploadedFile={uploadedKHSFile}
            setUploadedFile={setUploadedKHSFile}
            khsData={khsData}
            setKhsData={setKhsData}
          />
        );
      case 3:
        return (
          <PreviewStep
            cvData={completeCVData}
            parsedCV={parsedCVData}
            khsData={khsData}
            setCVData={setCompleteCVData}
            consentGiven={consentGiven}
            setConsentGiven={setConsentGiven}
          />
        );
      case 4:
        return (
          <AnalysisStep analysisData={analysisData} isAnalyzing={isAnalyzing} />
        );
      case 5:
        return <CareerSelectionStep analysisData={analysisData} />;
      default:
        return (
          <CVUploadStep
            uploadedFile={uploadedCVFile}
            setUploadedFile={setUploadedCVFile}
            parsedCV={parsedCVData}
            setParsedCV={setParsedCVData}
            cvData={completeCVData}
            setCVData={setCompleteCVData}
          />
        );
    }
  };

  if (showPreparation) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <PreparationScreen onStartOnboarding={handleStartOnboarding} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="bg-yellow-50 border-b border-yellow-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Debug Info - Authentication & Session Status
              </h3>
              <p className="text-xs text-yellow-600">
                Token validation, API authentication, and Redis session
                debugging. Note: Redis session endpoints may not be implemented
                yet on backend.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const token = getStoredAuthToken();
                  console.log("=== TOKEN DEBUG INFO ===");
                  console.log("Current stored token:", {
                    exists: !!token,
                    length: token?.length,
                    preview: token
                      ? token.substring(0, 50) + "..."
                      : "No token",
                    fullToken: token,
                  });

                  if (token) {
                    const tokenInfo = getTokenInfo(token);
                    if (tokenInfo) {
                      const isExpired = tokenInfo.exp * 1000 < Date.now();
                      console.log("Token validation result:", {
                        expiresAt: new Date(
                          tokenInfo.exp * 1000
                        ).toLocaleString(),
                        timeLeft: tokenInfo.timeLeft,
                        isExpired: isExpired,
                        currentTime: new Date().toLocaleString(),
                      });

                      toast.info("Token Status", {
                        description: `${
                          isExpired ? "EXPIRED" : "VALID"
                        } - Expires: ${new Date(
                          tokenInfo.exp * 1000
                        ).toLocaleString()} (${tokenInfo.timeLeft} left)`,
                      });
                    } else {
                      console.log("Invalid token format");
                      toast.error("Invalid token format", {
                        description: "Token appears to be corrupted",
                      });
                    }
                  } else {
                    console.log("No token found in localStorage");
                    toast.error("No token found", {
                      description: "Please login again",
                    });
                  }
                }}
              >
                Check Token
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  console.log("=== API VALIDATION TEST ===");
                  const isValid = await testTokenValidity();
                  console.log("API validation result:", isValid);

                  if (isValid) {
                    toast.success("API Token is valid", {
                      description:
                        "Authentication working properly with backend",
                    });
                  } else {
                    toast.error("API Token is invalid", {
                      description: "Backend rejected the authentication token",
                    });
                  }
                }}
              >
                Test API Auth
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Clear all tokens manually for testing
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("auth_token");
                  }
                  window.dispatchEvent(new Event("authStateChanged"));
                  toast.success("Tokens cleared", {
                    description: "All authentication tokens have been removed",
                  });
                }}
              >
                Clear All Tokens
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  console.log("=== SESSION DEBUG INFO ===");
                  console.log("Current session state:", {
                    cvData: !!completeCVData,
                    khsData: !!khsData,
                    parsedCV: !!parsedCVData,
                    uploadedCVFile: !!uploadedCVFile,
                    uploadedKHSFile: !!uploadedKHSFile,
                    consentGiven,
                    currentStep,
                  });

                  try {
                    const response = await sessionAPI.getSession();
                    console.log("Redis session data:", response);
                    toast.info("Session Status", {
                      description:
                        response.status === "success"
                          ? "Session data found in Redis"
                          : "No session data in Redis",
                    });
                  } catch (error) {
                    console.error("Session check error:", error);
                    toast.error("Session check failed", {
                      description: "Could not retrieve session data",
                    });
                  }
                }}
              >
                Check Session
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await sessionAPI.clearSession();
                    toast.success("Session cleared", {
                      description: "All session data removed from Redis",
                    });
                    console.log("Manual session clear completed");
                  } catch (error) {
                    console.error("Manual session clear error:", error);
                    toast.error("Session clear failed", {
                      description: "Could not clear session data",
                    });
                  }
                }}
              >
                Clear Session
              </Button>
            </div>
          </div>
        </div>
      </div>

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

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button variant="outline">Simpan Draft</Button>
              <Button
                onClick={handleNext}
                disabled={
                  currentStep === onboardingSteps.length ||
                  (currentStep === 3 && !consentGiven) ||
                  isAnalyzing
                }
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    {currentStep === onboardingSteps.length
                      ? "Selesai"
                      : "Selanjutnya"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
            {currentStep === 3 && !consentGiven && (
              <p className="text-xs text-muted-foreground mt-1">
                Berikan persetujuan untuk melanjutkan ke tahap berikutnya
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Preparation Screen Component
function PreparationScreen({
  onStartOnboarding,
}: {
  onStartOnboarding: () => void;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Selamat Datang di DevDirect! 🚀
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Mari siapkan profil IT Talent Anda untuk mendapat rekomendasi karier
            terbaik yang sesuai dengan kemampuan dan minat Anda.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              Persiapkan Dokumen Berikut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CV Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Curriculum Vitae (CV)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dokumen wajib
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Format: PDF (disarankan dengan format ATS)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Ukuran maksimal: 5MB</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Berisi informasi lengkap: pengalaman, skills, pendidikan
                    </span>
                  </div>
                </div>
              </div>

              {/* KHS Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Kartu Hasil Studi (KHS)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Untuk analisis lebih akurat
                    </p>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Format: PDF </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Membantu AI memahami background akademik
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">
                      Meningkatkan akurasi rekomendasi karier
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">
              Proses Onboarding (5 Langkah)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {onboardingSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="text-center">
                    <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <h4 className="font-medium text-sm text-foreground mb-1">
                      {step.title}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent>
            <div className="flex items-start gap-3">
              <div>
                <h3 className="font-semimedium text-blue-900 dark:text-blue-100 mb-2">
                  Tips untuk Hasil Terbaik
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>
                    • Pastikan CV terbaru dan mencantumkan semua pengalaman
                    relevan
                  </li>
                  <li>
                    • Sertakan skills teknis dan non-teknis yang Anda kuasai
                  </li>
                  <li>
                    • Jika ada sertifikat atau portfolio, cantumkan dalam CV
                  </li>
                  <li>• Proses akan memakan waktu sekitar 5-10 menit</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            onClick={onStartOnboarding}
            size="lg"
            className="px-8 py-6 text-lg"
          >
            Saya Sudah Siap, Mulai Setup Profil!
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

