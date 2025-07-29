"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AuthCallback() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Handling auth callback...");

        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          toast.error("Authentication failed", {
            description:
              error.message || "Something went wrong during authentication",
          });
          router.push("/");
          return;
        }

        if (data.session) {
          console.log("Auth session found:", data.session);

          // Note: Token exchange will be handled by AuthContext automatically
          // No need to manually set tokens here as AuthContext will handle the exchange

          // Show success message
          toast.success("Login berhasil!", {
            description:
              "Anda telah berhasil masuk dengan Google. Selamat datang di DevDirect!",
          });

          // Wait a moment for AuthContext to complete token exchange
          setTimeout(() => {
            // Redirect to onboarding for applicants or appropriate page for recruiters
            const userRole =
              data.session?.user?.user_metadata?.role || "applicant";

            if (userRole === "applicant") {
              router.push("/onboarding");
            } else if (userRole === "recruiter") {
              router.push("/recruiter/dashboard");
            } else {
              // Default to applicant onboarding
              router.push("/onboarding");
            }
          }, 1500); // Give AuthContext time to exchange tokens
        } else {
          console.log("No session found");
          toast.error("Authentication incomplete", {
            description: "Unable to complete authentication. Please try again.",
          });
          router.push("/");
        }
      } catch (error) {
        console.error("Callback handling error:", error);
        toast.error("Authentication error", {
          description: "An unexpected error occurred during authentication",
        });
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-semibold text-foreground">
            Menyelesaikan autentikasi...
          </h2>
          <p className="text-muted-foreground">
            Mohon tunggu sebentar while kami memproses login Anda
          </p>
        </div>
      </div>
    );
  }

  return null;
}
