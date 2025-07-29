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
import { Loader2, User, Mail, Lock, Building2 } from "lucide-react";
import { authAPI, type RegisterRequest } from "@/lib/api";
import { toast } from "sonner";

interface RecruiterRegisterDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShowLogin?: () => void;
}

export default function RecruiterRegisterDialog({
  trigger,
  open,
  onOpenChange,
  onShowLogin,
}: RecruiterRegisterDialogProps) {
  const [formData, setFormData] = useState<RegisterRequest>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "recruiter", // Fixed role for recruiters
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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password wajib diisi";
    } else if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Password tidak cocok";
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

    toast.info("Mendaftar sebagai Recruiter...", {
      description: "Mengirim data ke server.",
    });

    try {
      const response = await authAPI.register(formData);

      if (response.status === "success") {
        toast.success("Registrasi berhasil!", {
          description: "Selamat! Akun Recruiter Anda telah berhasil dibuat.",
        });

        // Store token if provided
        if (response.data?.token) {
          localStorage.setItem("auth_token", response.data.token);
        }

        onOpenChange?.(false);
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          name: "",
          role: "recruiter",
        });
        setErrors({});

        // Show login dialog after successful registration
        setTimeout(() => {
          onShowLogin?.();
        }, 500);
      } else {
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
      console.error("Network Error:", error);
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
          <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            Daftar sebagai Recruiter
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Bergabunglah dengan platform untuk menemukan IT Talent terbaik bagi
            perusahaan Anda
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Perusahaan
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="recruiter@company.com"
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

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Konfirmasi Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Masukkan password kembali"
                value={formData.confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange("confirmPassword", e.target.value)
                }
                className={`pl-10 ${
                  errors.confirmPassword ? "border-destructive" : ""
                }`}
                disabled={isLoading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100 text-sm">
                  Untuk Recruiter & HR
                </h4>
                <p className="text-xs text-orange-800 dark:text-orange-200 mt-1">
                  Akun ini khusus untuk menemukan dan merekrut IT Talent
                  terbaik. Gunakan email perusahaan untuk verifikasi yang lebih
                  mudah.
                </p>
              </div>
            </div>
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
          Sudah punya akun Recruiter?{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold "
            onClick={() => {
              onOpenChange?.(false);
              setTimeout(() => {
                onShowLogin?.();
              }, 100);
            }}
          >
            Login di sini
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
