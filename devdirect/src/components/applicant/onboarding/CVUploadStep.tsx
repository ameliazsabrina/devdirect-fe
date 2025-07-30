"use client";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Eye, CheckCircle2, Loader2 } from "lucide-react";
import {
  cvAPI,
  type ParsedCV,
  type CVData,
  getStoredAuthToken,
} from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CVUploadStepProps {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  parsedCV: ParsedCV | null;
  setParsedCV: (cv: ParsedCV | null) => void;
  cvData: CVData | null;
  setCVData: (data: CVData | null) => void;
}

export function CVUploadStep({
  uploadedFile,
  setUploadedFile,
  parsedCV,
  setParsedCV,
  cvData,
  setCVData,
}: CVUploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingCVData, setIsLoadingCVData] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  const fetchCVData = async () => {
    if (!checkAuthentication()) return;

    setIsLoadingCVData(true);
    try {
      const response = await cvAPI.getCVData();

      if (response.status === "success" && response.data) {
        setCVData(response.data);
        console.log("CV Data fetched successfully:", response.data);
      } else {
        if (
          response.message?.includes("Authentication expired") ||
          response.message?.includes("Invalid or expired token")
        ) {
          toast.error("Session expired", {
            description: "Please login again to continue.",
          });
          router.push("/");
          return;
        }

        toast.error("Gagal mengambil data CV", {
          description:
            response.message || "Tidak dapat mengambil data CV dari server.",
        });
      }
    } catch (error) {
      console.error("Error fetching CV data:", error);
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat mengambil data CV. Coba refresh halaman.",
      });
    } finally {
      setIsLoadingCVData(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      return "Format file tidak didukung. Hanya PDF, DOC, DOCX, dan TXT yang diperbolehkan.";
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

    toast.info("Mengupload CV...", {
      description: "File sedang diproses dengan AI untuk ekstraksi data.",
    });

    try {
      const response = await cvAPI.uploadCV(file);

      if (response.status === "success" && response.data) {
        setParsedCV(response.data.parsed_cv);
        toast.success("CV berhasil diupload!", {
          description: "Data CV Anda telah berhasil diekstrak dan dianalisis.",
        });

        setTimeout(() => {
          fetchCVData();
        }, 1000);
      } else {
        if (
          response.message?.includes("Authentication expired") ||
          response.message?.includes("Invalid or expired token") ||
          response.error?.includes("Invalid or expired token")
        ) {
          toast.error("Session expired", {
            description: "Your login session has expired. Please login again.",
          });
          router.push("/");
          return;
        }

        toast.error("Upload gagal", {
          description:
            response.message || "Terjadi kesalahan saat mengupload CV.",
        });
        setUploadedFile(null);
      }
    } catch (error) {
      console.error("CV Upload Error:", error);
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat mengupload CV. Coba lagi nanti.",
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
    setParsedCV(null);
    setCVData(null);
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
          <Upload
            className={`w-12 h-12 mx-auto mb-4 ${
              isDragOver ? "text-primary" : "text-muted-foreground"
            }`}
          />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Upload CV Anda
          </h3>
          <p className="text-muted-foreground mb-4">
            {isDragOver
              ? "Lepas file di sini"
              : "Drag & drop file CV atau klik untuk browse"}
          </p>
          <Button disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Pilih File CV
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Mendukung format PDF, DOC, DOCX, TXT (Max 5MB)
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
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
                  CV berhasil diupload!
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
                  Memproses CV...
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  AI sedang menganalisis dan mengekstrak data dari CV Anda
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
                        Mengekstrak informasi pribadi
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Nama, email, kontak
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        Mengidentifikasi skills
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
                        Menganalisis pengalaman
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Riwayat kerja dan pendidikan
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

          {isLoadingCVData && !isUploading && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  Mengambil Data Lengkap...
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Memuat informasi CV yang telah diproses
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-8">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Sebentar lagi selesai...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {cvData && !isLoadingCVData && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Data CV Lengkap
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  File: {cvData.cv_file_name} • Diupload:{" "}
                  {new Date(cvData.cv_uploaded_at).toLocaleString("id-ID")}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium text-foreground mb-3">
                    Informasi Pribadi
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nama:</span>{" "}
                      <span className="ml-2 text-foreground font-medium">
                        {cvData.full_name}
                      </span>
                    </div>
                    {cvData.headline && (
                      <div className="md:col-span-2">
                        <span className="text-muted-foreground">Headline:</span>{" "}
                        <span className="ml-2 text-foreground">
                          {cvData.headline}
                        </span>
                      </div>
                    )}
                  </div>
                  {cvData.summary && (
                    <div className="mt-3">
                      <span className="text-muted-foreground font-medium">
                        Ringkasan:
                      </span>
                      <p className="text-sm text-foreground mt-2 bg-muted/50 p-3 rounded">
                        {cvData.summary}
                      </p>
                    </div>
                  )}
                </div>

                {cvData.skills && cvData.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">
                      Skills ({cvData.skills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {cvData.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {cvData.education_records &&
                  cvData.education_records.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">
                        Pendidikan
                      </h4>
                      <div className="space-y-3">
                        {cvData.education_records.map((edu, index) => (
                          <div
                            key={index}
                            className="bg-muted/30 p-4 rounded-lg text-sm border border-border/50"
                          >
                            <div className="font-medium text-foreground">
                              {edu.degree} - {edu.major}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              {edu.institution}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              {edu.start_year} - {edu.end_year || "Sekarang"} •
                              GPA: {edu.gpa}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {cvData.experiences && cvData.experiences.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">
                      Pengalaman Kerja
                    </h4>
                    <div className="space-y-3">
                      {cvData.experiences.map((exp, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 p-4 rounded-lg text-sm border border-border/50"
                        >
                          <div className="font-medium text-foreground">
                            {exp.position}
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {exp.company}
                          </div>
                          <div className="text-muted-foreground mt-1">
                            {exp.start_date} - {exp.end_date || "Sekarang"}
                          </div>
                          <p className="mt-2 text-foreground">
                            {exp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cvData.projects && cvData.projects.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">Proyek</h4>
                    <div className="space-y-3">
                      {cvData.projects.map((project, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 p-4 rounded-lg text-sm border border-border/50"
                        >
                          <div className="font-medium text-foreground">
                            {project.name}
                          </div>
                          <p className="mt-1 text-foreground">
                            {project.description}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {project.repo_url && (
                              <a
                                href={project.repo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                              >
                                Repository
                              </a>
                            )}
                            {project.demo_url && (
                              <a
                                href={project.demo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-accent/10 text-accent-foreground px-2 py-1 rounded hover:bg-accent/20"
                              >
                                Demo
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {parsedCV && !cvData && !isLoadingCVData && (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Preview Data CV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">
                    Informasi Pribadi
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Nama:</span>{" "}
                      <span className="ml-2 text-foreground">
                        {parsedCV.full_name}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      <span className="ml-2 text-foreground">
                        {parsedCV.email}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telepon:</span>{" "}
                      <span className="ml-2 text-foreground">
                        {parsedCV.phone}
                      </span>
                    </div>
                  </div>
                  {parsedCV.summary && (
                    <div className="mt-2">
                      <span className="text-muted-foreground">Ringkasan:</span>
                      <p className="text-sm text-foreground mt-1 bg-muted/50 p-2 rounded">
                        {parsedCV.summary}
                      </p>
                    </div>
                  )}
                </div>

                {parsedCV.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {parsedCV.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {parsedCV.education.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">
                      Pendidikan
                    </h4>
                    {parsedCV.education.map((edu, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 p-3 rounded text-sm"
                      >
                        <div className="font-medium">
                          {edu.degree} - {edu.major}
                        </div>
                        <div className="text-muted-foreground">
                          {edu.institution}
                        </div>
                        <div className="text-muted-foreground">
                          {edu.start_year} - {edu.end_year} | GPA: {edu.gpa}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {parsedCV.experience.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">
                      Pengalaman
                    </h4>
                    {parsedCV.experience.map((exp, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 p-3 rounded text-sm"
                      >
                        <div className="font-medium">{exp.position}</div>
                        <div className="text-muted-foreground">
                          {exp.company}
                        </div>
                        <div className="text-muted-foreground">
                          {exp.start_date} - {exp.end_date}
                        </div>
                        <p className="mt-1">{exp.description}</p>
                      </div>
                    ))}
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
