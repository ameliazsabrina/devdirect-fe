"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, User, Mail, Lock, UserCheck } from "lucide-react";
import { authAPI, type RegisterRequest } from "@/lib/api";
import { toast } from "sonner";
import LoginDialog from "./loginDialog";

interface RegisterDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShowLogin?: () => void;
}

export default function RegisterDialog({
  trigger,
  open,
  onOpenChange,
  onShowLogin,
}: RegisterDialogProps) {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: "",
    password: "",
    name: "",
    role: "applicant",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Nama lengkap wajib diisi";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Test toast to make sure it's working
    toast.info("Mencoba mendaftar...", {
      description: "Mengirim data ke server.",
    });

    try {
      const response = await authAPI.register(formData);

      console.log("API Response:", response); // Debug log

      if (response.status === "success") {
        toast.success("Registrasi berhasil!", {
          description:
            "Akun Anda telah berhasil dibuat. Selamat datang di DevDirect!",
        });

        // Store token if provided
        if (response.data?.token) {
          localStorage.setItem("auth_token", response.data.token);
        }

        onOpenChange?.(false);
        setFormData({
          email: "",
          password: "",
          name: "",
          role: "applicant",
        });
        setErrors({});

        // Show login dialog after successful registration
        setTimeout(() => {
          onShowLogin?.();
        }, 500);
      } else {
        // Handle API errors
        console.log("API Error:", response); // Debug log
        if (response.message?.includes("already exists")) {
          toast.error("Email sudah terdaftar", {
            description:
              "Gunakan email lain atau coba login dengan akun yang sudah ada.",
          });
        } else if (response.message?.includes("validation")) {
          toast.error("Data tidak valid", {
            description: "Periksa kembali data yang Anda masukkan.",
          });
        } else {
          toast.error("Registrasi gagal", {
            description:
              response.message || "Terjadi kesalahan saat membuat akun.",
          });
        }
      }
    } catch (error) {
      console.error("Network Error:", error); // Debug log
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server. Coba lagi nanti.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Daftar ke DevDirect
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Bergabunglah dengan platform AI untuk menghubungkan talent dengan
            peluang karier terbaik
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Nama Lengkap
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Masukkan nama lengkap"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("name", e.target.value)
                }
                className={`pl-10 ${errors.name ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
            </div>
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={formData.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("email", e.target.value)
                }
                className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("password", e.target.value)
                }
                className={`pl-10 ${
                  errors.password ? "border-destructive" : ""
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Daftar sebagai
            </Label>
            <RadioGroup
              value={formData.role}
              onValueChange={(value: string) =>
                handleInputChange("role", value as "applicant" | "recruiter")
              }
              className="grid grid-cols-2 gap-4"
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="applicant" id="applicant" />
                <Label htmlFor="applicant" className="flex-1 cursor-pointer">
                  <div className="font-medium">IT Talent</div>
                  <div className="text-xs text-muted-foreground">
                    Cari pekerjaan impian
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="recruiter" id="recruiter" />
                <Label htmlFor="recruiter" className="flex-1 cursor-pointer">
                  <div className="font-medium">Recruiter</div>
                  <div className="text-xs text-muted-foreground">
                    Temukan talent terbaik
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[120px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mendaftar...
                </>
              ) : (
                "Daftar Sekarang"
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
            onClick={() => {
              onOpenChange?.(false);
              setTimeout(() => {
                onShowLogin?.();
              }, 100);
            }}
          >
            Sign in di sini
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
