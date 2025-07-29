"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye,
  Edit,
  Save,
  X,
  Loader2,
} from "lucide-react";
import {
  cvAPI,
  type ParsedCV,
  type CVData,
  type CVUpdateRequest,
  type KHSData,
  getStoredAuthToken,
} from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PreviewStepProps {
  cvData: CVData | null;
  parsedCV: ParsedCV | null;
  khsData: KHSData | null;
  setCVData: (data: CVData | null) => void;
  consentGiven: boolean;
  setConsentGiven: (consent: boolean) => void;
}

export function PreviewStep({
  cvData,
  parsedCV,
  khsData,
  setCVData,
  consentGiven,
  setConsentGiven,
}: PreviewStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<CVUpdateRequest>({});
  const router = useRouter();

  React.useEffect(() => {
    if (cvData) {
      setEditData({
        full_name: cvData.full_name,
        summary: cvData.summary || "",
        skills: cvData.skills || [],
        education:
          cvData.education_records?.map((edu) => ({
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            major: edu.major,
            gpa: edu.gpa,
            start_year: edu.start_year,
            end_year: edu.end_year,
          })) || [],
        experience:
          cvData.experiences?.map((exp) => ({
            id: exp.id,
            company: exp.company,
            position: exp.position,
            start_date: exp.start_date,
            end_date: exp.end_date,
            description: exp.description,
          })) || [],
        projects:
          cvData.projects?.map((proj) => ({
            id: proj.id,
            name: proj.name,
            description: proj.description,
            repo_url: proj.repo_url,
            demo_url: proj.demo_url,
          })) || [],
      });
    }
  }, [cvData]);

  const refreshCVData = async () => {
    try {
      const response = await cvAPI.getCVData();
      if (response.status === "success" && response.data) {
        setCVData(response.data);
        console.log("CV data refreshed successfully:", response.data);
      }
    } catch (error) {
      console.error("Error refreshing CV data:", error);
    }
  };

  const handleSave = async () => {
    const token = getStoredAuthToken();
    if (!token) {
      toast.error("Session expired", {
        description: "Please login again to continue.",
      });
      router.push("/");
      return;
    }

    setIsSaving(true);
    try {
      const response = await cvAPI.updateCV(editData);

      if (response.status === "success") {
        toast.success("Data berhasil disimpan!", {
          description: "Perubahan CV Anda telah disimpan.",
        });
        setIsEditing(false);

        await refreshCVData();
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

        toast.error("Gagal menyimpan", {
          description:
            response.message || "Terjadi kesalahan saat menyimpan data.",
        });
      }
    } catch (error) {
      console.error("Save CV Error:", error);
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat menyimpan perubahan. Coba lagi nanti.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (cvData) {
      setEditData({
        full_name: cvData.full_name,
        summary: cvData.summary || "",
        skills: cvData.skills || [],
        education:
          cvData.education_records?.map((edu) => ({
            id: edu.id,
            institution: edu.institution,
            degree: edu.degree,
            major: edu.major,
            gpa: edu.gpa,
            start_year: edu.start_year,
            end_year: edu.end_year,
          })) || [],
        experience:
          cvData.experiences?.map((exp) => ({
            id: exp.id,
            company: exp.company,
            position: exp.position,
            start_date: exp.start_date,
            end_date: exp.end_date,
            description: exp.description,
          })) || [],
        projects:
          cvData.projects?.map((proj) => ({
            id: proj.id,
            name: proj.name,
            description: proj.description,
            repo_url: proj.repo_url,
            demo_url: proj.demo_url,
          })) || [],
      });
    }
  };

  const updateSkills = (skillsText: string) => {
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    setEditData({ ...editData, skills });
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Preview Data
        </h3>
        <p className="text-muted-foreground">
          Periksa dan edit informasi yang berhasil diekstrak dari CV Anda
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-foreground">Informasi CV</h4>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Simpan
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Nama Lengkap</Label>
                  <Input
                    id="full_name"
                    value={editData.full_name || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, full_name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="summary">Ringkasan</Label>
                  <textarea
                    id="summary"
                    value={editData.summary || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, summary: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md resize-none h-20 text-sm"
                    placeholder="Ringkasan profesional Anda..."
                  />
                </div>
                <div>
                  <Label htmlFor="skills">Skills (pisahkan dengan koma)</Label>
                  <Input
                    id="skills"
                    value={editData.skills?.join(", ") || ""}
                    onChange={(e) => updateSkills(e.target.value)}
                    className="mt-1"
                    placeholder="JavaScript, React, Node.js, TypeScript"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium">Pendidikan</Label>
                  <div className="space-y-4 mt-2">
                    {editData.education?.map((edu, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 p-4 rounded-lg space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`edu_institution_${index}`}>
                              Institusi
                            </Label>
                            <Input
                              id={`edu_institution_${index}`}
                              value={edu.institution}
                              onChange={(e) => {
                                const newEducation = [
                                  ...(editData.education || []),
                                ];
                                newEducation[index] = {
                                  ...edu,
                                  institution: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  education: newEducation,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edu_degree_${index}`}>Gelar</Label>
                            <Input
                              id={`edu_degree_${index}`}
                              value={edu.degree}
                              onChange={(e) => {
                                const newEducation = [
                                  ...(editData.education || []),
                                ];
                                newEducation[index] = {
                                  ...edu,
                                  degree: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  education: newEducation,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edu_major_${index}`}>
                              Jurusan
                            </Label>
                            <Input
                              id={`edu_major_${index}`}
                              value={edu.major}
                              onChange={(e) => {
                                const newEducation = [
                                  ...(editData.education || []),
                                ];
                                newEducation[index] = {
                                  ...edu,
                                  major: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  education: newEducation,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edu_gpa_${index}`}>GPA</Label>
                            <Input
                              id={`edu_gpa_${index}`}
                              type="number"
                              step="0.01"
                              min="0"
                              max="4"
                              value={edu.gpa}
                              onChange={(e) => {
                                const newEducation = [
                                  ...(editData.education || []),
                                ];
                                newEducation[index] = {
                                  ...edu,
                                  gpa: parseFloat(e.target.value) || 0,
                                };
                                setEditData({
                                  ...editData,
                                  education: newEducation,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edu_start_year_${index}`}>
                              Tahun Mulai
                            </Label>
                            <Input
                              id={`edu_start_year_${index}`}
                              type="number"
                              value={edu.start_year}
                              onChange={(e) => {
                                const newEducation = [
                                  ...(editData.education || []),
                                ];
                                newEducation[index] = {
                                  ...edu,
                                  start_year: parseInt(e.target.value) || 0,
                                };
                                setEditData({
                                  ...editData,
                                  education: newEducation,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edu_end_year_${index}`}>
                              Tahun Selesai
                            </Label>
                            <Input
                              id={`edu_end_year_${index}`}
                              type="number"
                              value={edu.end_year || ""}
                              onChange={(e) => {
                                const newEducation = [
                                  ...(editData.education || []),
                                ];
                                newEducation[index] = {
                                  ...edu,
                                  end_year: e.target.value
                                    ? parseInt(e.target.value)
                                    : null,
                                };
                                setEditData({
                                  ...editData,
                                  education: newEducation,
                                });
                              }}
                              className="mt-1"
                              placeholder="Kosongkan jika masih berlangsung"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">
                    Pengalaman Kerja
                  </Label>
                  <div className="space-y-4 mt-2">
                    {editData.experience?.map((exp, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 p-4 rounded-lg space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`exp_company_${index}`}>
                              Perusahaan
                            </Label>
                            <Input
                              id={`exp_company_${index}`}
                              value={exp.company}
                              onChange={(e) => {
                                const newExperience = [
                                  ...(editData.experience || []),
                                ];
                                newExperience[index] = {
                                  ...exp,
                                  company: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  experience: newExperience,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`exp_position_${index}`}>
                              Posisi
                            </Label>
                            <Input
                              id={`exp_position_${index}`}
                              value={exp.position}
                              onChange={(e) => {
                                const newExperience = [
                                  ...(editData.experience || []),
                                ];
                                newExperience[index] = {
                                  ...exp,
                                  position: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  experience: newExperience,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`exp_start_date_${index}`}>
                              Tanggal Mulai
                            </Label>
                            <Input
                              id={`exp_start_date_${index}`}
                              type="date"
                              value={exp.start_date}
                              onChange={(e) => {
                                const newExperience = [
                                  ...(editData.experience || []),
                                ];
                                newExperience[index] = {
                                  ...exp,
                                  start_date: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  experience: newExperience,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`exp_end_date_${index}`}>
                              Tanggal Selesai
                            </Label>
                            <Input
                              id={`exp_end_date_${index}`}
                              type="date"
                              value={exp.end_date || ""}
                              onChange={(e) => {
                                const newExperience = [
                                  ...(editData.experience || []),
                                ];
                                newExperience[index] = {
                                  ...exp,
                                  end_date: e.target.value || null,
                                };
                                setEditData({
                                  ...editData,
                                  experience: newExperience,
                                });
                              }}
                              className="mt-1"
                              placeholder="Kosongkan jika masih bekerja"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`exp_description_${index}`}>
                            Deskripsi
                          </Label>
                          <textarea
                            id={`exp_description_${index}`}
                            value={exp.description}
                            onChange={(e) => {
                              const newExperience = [
                                ...(editData.experience || []),
                              ];
                              newExperience[index] = {
                                ...exp,
                                description: e.target.value,
                              };
                              setEditData({
                                ...editData,
                                experience: newExperience,
                              });
                            }}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md resize-none h-20 text-sm"
                            placeholder="Deskripsi pekerjaan dan pencapaian..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">Proyek</Label>
                  <div className="space-y-4 mt-2">
                    {editData.projects?.map((proj, index) => (
                      <div
                        key={index}
                        className="bg-muted/30 p-4 rounded-lg space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor={`proj_name_${index}`}>
                              Nama Proyek
                            </Label>
                            <Input
                              id={`proj_name_${index}`}
                              value={proj.name}
                              onChange={(e) => {
                                const newProjects = [
                                  ...(editData.projects || []),
                                ];
                                newProjects[index] = {
                                  ...proj,
                                  name: e.target.value,
                                };
                                setEditData({
                                  ...editData,
                                  projects: newProjects,
                                });
                              }}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`proj_repo_url_${index}`}>
                              URL Repository
                            </Label>
                            <Input
                              id={`proj_repo_url_${index}`}
                              value={proj.repo_url || ""}
                              onChange={(e) => {
                                const newProjects = [
                                  ...(editData.projects || []),
                                ];
                                newProjects[index] = {
                                  ...proj,
                                  repo_url: e.target.value || null,
                                };
                                setEditData({
                                  ...editData,
                                  projects: newProjects,
                                });
                              }}
                              className="mt-1"
                              placeholder="https://github.com/..."
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor={`proj_demo_url_${index}`}>
                              URL Demo
                            </Label>
                            <Input
                              id={`proj_demo_url_${index}`}
                              value={proj.demo_url || ""}
                              onChange={(e) => {
                                const newProjects = [
                                  ...(editData.projects || []),
                                ];
                                newProjects[index] = {
                                  ...proj,
                                  demo_url: e.target.value || null,
                                };
                                setEditData({
                                  ...editData,
                                  projects: newProjects,
                                });
                              }}
                              className="mt-1"
                              placeholder="https://demo.example.com"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor={`proj_description_${index}`}>
                            Deskripsi
                          </Label>
                          <textarea
                            id={`proj_description_${index}`}
                            value={proj.description}
                            onChange={(e) => {
                              const newProjects = [
                                ...(editData.projects || []),
                              ];
                              newProjects[index] = {
                                ...proj,
                                description: e.target.value,
                              };
                              setEditData({
                                ...editData,
                                projects: newProjects,
                              });
                            }}
                            className="w-full mt-1 px-3 py-2 border border-border rounded-md resize-none h-20 text-sm"
                            placeholder="Deskripsi proyek dan teknologi yang digunakan..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nama:</span>
                    <span className="ml-2 text-foreground font-medium">
                      {cvData?.full_name ||
                        parsedCV?.full_name ||
                        "Tidak tersedia"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 text-foreground">
                      {parsedCV?.email || "Tidak tersedia"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telepon:</span>
                    <span className="ml-2 text-foreground">
                      {parsedCV?.phone || "Tidak tersedia"}
                    </span>
                  </div>
                </div>

                {(cvData?.summary || editData.summary) && (
                  <div className="mt-4">
                    <span className="text-muted-foreground font-medium">
                      Ringkasan:
                    </span>
                    <p className="text-sm text-foreground mt-2 bg-muted/50 p-3 rounded">
                      {cvData?.summary || editData.summary}
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <span className="text-muted-foreground font-medium">
                    Skills:
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(cvData?.skills || parsedCV?.skills || []).map(
                      (skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-accent/20 text-accent-foreground rounded-full text-sm"
                        >
                          {skill}
                        </span>
                      )
                    )}
                  </div>
                </div>

                {cvData?.education_records &&
                  cvData.education_records.length > 0 && (
                    <div className="mt-6">
                      <span className="text-muted-foreground font-medium">
                        Pendidikan:
                      </span>
                      <div className="space-y-3 mt-2">
                        {cvData.education_records.map((edu, index) => (
                          <div
                            key={index}
                            className="bg-muted/30 p-3 rounded-lg text-sm border border-border/50"
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

                {cvData?.experiences && cvData.experiences.length > 0 && (
                  <div className="mt-6">
                    <span className="text-muted-foreground font-medium">
                      Pengalaman Kerja:
                    </span>
                    <div className="space-y-3 mt-2">
                      {cvData.experiences.map((exp, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 p-3 rounded-lg text-sm border border-border/50"
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

                {cvData?.projects && cvData.projects.length > 0 && (
                  <div className="mt-6">
                    <span className="text-muted-foreground font-medium">
                      Proyek:
                    </span>
                    <div className="space-y-3 mt-2">
                      {cvData.projects.map((project, index) => (
                        <div
                          key={index}
                          className="bg-muted/30 p-3 rounded-lg text-sm border border-border/50"
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
              </div>
            )}
          </CardContent>
        </Card>

        {khsData && (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-foreground">
                  Informasi Akademik
                </h4>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Read-only
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Semester:</span>
                  <span className="ml-2 text-foreground font-medium">
                    {khsData.semester}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tahun Akademik:</span>
                  <span className="ml-2 text-foreground font-medium">
                    {khsData.academic_year}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">IPK Semester:</span>
                  <span className="ml-2 text-foreground font-medium">
                    {khsData.semester_gpa?.toFixed(2) || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">IPK Kumulatif:</span>
                  <span className="ml-2 text-foreground font-medium">
                    {khsData.cumulative_gpa?.toFixed(2) || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total SKS:</span>
                  <span className="ml-2 text-foreground font-medium">
                    {khsData.cumulative_sks}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Mata Kuliah:</span>
                  <span className="ml-2 text-foreground font-medium">
                    {khsData.course_grades?.length || 0} courses
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-accent/20 bg-accent/5">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="data-consent"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="w-5 h-5 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2 mt-0.5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="data-consent"
                  className="text-sm font-medium leading-relaxed cursor-pointer"
                >
                  Saya setuju bahwa data CV dan KHS yang telah saya upload dapat
                  dianalisis oleh sistem AI untuk memberikan rekomendasi karier
                  yang sesuai dengan kemampuan dan minat saya. Data ini akan
                  digunakan secara bertanggung jawab dan sesuai dengan kebijakan
                  privasi platform.
                </Label>
                <p className="text-xs text-muted-foreground mt-2">
                  * Persetujuan ini diperlukan untuk melanjutkan ke tahap
                  analisis AI
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}