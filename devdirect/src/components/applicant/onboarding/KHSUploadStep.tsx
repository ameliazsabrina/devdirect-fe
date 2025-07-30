"use client";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, CheckCircle2, Loader2 } from "lucide-react";
import { khsAPI, type KHSData, getStoredAuthToken } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface KHSUploadStepProps {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  khsData: KHSData | null;
  setKhsData: (data: KHSData | null) => void;
  onParsingStateChange?: (isParsing: boolean) => void;
}

export function KHSUploadStep({
  uploadedFile,
  setUploadedFile,
  khsData,
  setKhsData,
  onParsingStateChange,
}: KHSUploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Notify parent component when parsing state changes
  React.useEffect(() => {
    onParsingStateChange?.(isUploading);
  }, [isUploading, onParsingStateChange]);

  const checkAuthentication = (): boolean => {
    const token = getStoredAuthToken();
    console.log("Authentication check:", {
      hasToken: !!token,
      tokenLength: token?.length,
    });

    if (!token) {
      toast.error("Session expired", {
        description: "Please login again to continue.",
      });
      router.push("/");
      return false;
    }
    return true;
  };

  const validateFile = (file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Format file tidak didukung. Hanya PDF yang diperbolehkan untuk KHS.";
    }

    if (file.size > 5 * 1024 * 1024) {
      return "Ukuran file terlalu besar. Maksimal 5MB.";
    }

    return null;
  };

  const handleFileUpload = async (file: File) => {
    if (!checkAuthentication()) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error("File tidak valid", {
        description: validationError,
      });
      return;
    }

    setIsUploading(true);
    setUploadedFile(file);

    toast.info("Mengupload KHS...", {
      description:
        "File sedang diproses dengan AI untuk ekstraksi data akademik.",
    });

    try {
      const response = await khsAPI.uploadKHS(file);

      if (response.status === "success" && response.data) {
        const khsData = response.data;
        if (khsData.semester && khsData.academic_year && khsData.file_name) {
          setKhsData(khsData);
          toast.success("KHS berhasil diupload!", {
            description:
              "Data KHS Anda telah berhasil diekstrak dan dianalisis.",
          });
        } else {
          console.error("Invalid KHS data structure:", khsData);
          toast.error("Data KHS tidak lengkap", {
            description:
              "File berhasil diupload tapi data tidak dapat diproses dengan benar.",
          });
        }
      } else {
        if (
          response.message?.includes("Authentication expired") ||
          response.message?.includes("Invalid or expired token")
        ) {
          toast.error("Session expired", {
            description: "Your login session has expired. Please login again.",
          });
          router.push("/");
          return;
        }

        if (response.message?.includes("already exists")) {
          toast.error("KHS sudah ada", {
            description:
              response.message ||
              "KHS untuk semester ini sudah pernah diupload.",
          });
        } else {
          toast.error("Upload gagal", {
            description:
              response.message || "Terjadi kesalahan saat mengupload KHS.",
          });
        }
        setUploadedFile(null);
      }
    } catch (error) {
      console.error("KHS Upload Error:", error);
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat mengupload KHS. Coba lagi nanti.",
      });
      setUploadedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const resetUpload = () => {
    setUploadedFile(null);
    setKhsData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 bg-card/30 backdrop-blur cursor-pointer ${
            isDragOver
              ? "border-primary bg-primary/10"
              : "border-border hover:border-accent/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <FileText
            className={`w-12 h-12 mx-auto mb-4 ${
              isDragOver ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Upload KHS
          </h3>
          <p className="text-muted-foreground mb-4">
            {isDragOver
              ? "Lepas file di sini"
              : "Drag & drop file KHS atau klik untuk browse"}
          </p>
          <Button disabled={isUploading} variant="outline">
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Pilih File KHS
              </>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 dark:text-green-100">
                  KHS berhasil diupload!
                </h4>
                <p className="text-sm text-green-800 dark:text-green-200">
                  {uploadedFile.name} (
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={resetUpload}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                Ganti File
              </Button>
            </div>
          </div>

          {isUploading && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Memproses KHS...
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI sedang menganalisis dan mengekstrak data akademik dari KHS
                  Anda
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center"></div>
                    <div>
                      <div className="text-sm font-medium">
                        Mengekstrak informasi semester
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Semester, tahun akademik
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Menganalisis nilai mata kuliah
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Kode, nama, SKS, nilai
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Menghitung IPK</div>
                      <div className="text-xs text-muted-foreground">
                        GPA semester dan kumulatif
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Proses ini biasanya memakan waktu 10-30 detik...
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {khsData && !isUploading && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Data KHS Lengkap
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  File: {khsData.file_name} • Diupload:{" "}
                  {new Date(khsData.uploaded_at).toLocaleString("id-ID")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-foreground mb-3">
                    Informasi Akademik
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Semester:</span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {khsData.semester}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Tahun Akademik:
                      </span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {khsData.academic_year}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        IPK Semester:
                      </span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {khsData.semester_gpa?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        IPK Kumulatif:
                      </span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {khsData.cumulative_gpa?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        SKS Semester:
                      </span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {khsData.total_sks}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        SKS Kumulatif:
                      </span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {khsData.cumulative_sks}
                      </span>
                    </div>
                  </div>
                </div>

                {khsData.course_grades && khsData.course_grades.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">
                      Nilai Mata Kuliah ({khsData.course_grades.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {khsData.course_grades.map((course, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 p-3 rounded-lg text-sm border border-border/50"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-foreground">
                                {course.course_code} - {course.course_name}
                              </div>
                              <div className="text-muted-foreground mt-1">
                                SKS: {course.sks} • {course.grade_description}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-lg">
                                {course.grade}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {course.grade_point.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
