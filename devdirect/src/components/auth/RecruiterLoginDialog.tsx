"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Loader2, Mail, Lock, Building2 } from "lucide-react";
import { authAPI, type LoginRequest } from "@/lib/api";
import { toast } from "sonner";

interface RecruiterLoginDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShowRegister?: () => void;
}

export default function RecruiterLoginDialog({
  trigger,
  open,
  onOpenChange,
  onShowRegister,
}: RecruiterLoginDialogProps) {
  const [formData, setFormData] = useState<LoginRequest>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format email tidak valid";
    }

    if (!formData.password) {
      newErrors.password = "Password wajib diisi";
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

    toast.info("Mencoba login sebagai Recruiter...", {
      description: "Memverifikasi kredensial Anda.",
    });

    try {
      const response = await authAPI.login(formData);

      console.log("Recruiter Login API Response:", response);

      if (response.status === "success") {
        toast.success("Login berhasil!", {
          description: "Selamat datang kembali, Recruiter!",
        });

        // Store token if provided
        if (response.data?.token) {
          localStorage.setItem("auth_token", response.data.token);
        }

        onOpenChange?.(false);
        setFormData({
          email: "",
          password: "",
        });
        setErrors({});

        // Redirect to recruiter dashboard
        router.push("/recruiter/dashboard");
      } else {
        if (response.message?.includes("Invalid credentials")) {
          toast.error("Kredensial tidak valid", {
            description: "Email atau password yang Anda masukkan salah.",
          });
        } else {
          toast.error("Login gagal", {
            description: response.message || "Terjadi kesalahan saat login.",
          });
        }
      }
    } catch (error) {
      console.error("Recruiter Login Network Error:", error);
      toast.error("Terjadi kesalahan", {
        description: "Tidak dapat terhubung ke server. Coba lagi nanti.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <DialogTrigger asChild>
          <div data-dialog="recruiter-login">{trigger}</div>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold flex items-center justify-center gap-2">
            Login Recruiter
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Masuk ke akun Recruiter Anda untuk mengelola perekrutan IT Talent
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
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

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Masukkan password"
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
                  Login...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </DialogFooter>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Belum punya akun Recruiter?{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold "
            onClick={() => {
              onOpenChange?.(false);
              setTimeout(() => {
                onShowRegister?.();
              }, 100);
            }}
          >
            Daftar di sini
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
