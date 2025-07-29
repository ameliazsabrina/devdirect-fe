"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizeable-navbar";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Building2, LogOut } from "lucide-react";
import ApplicantRegisterDialog from "@/components/auth/ApplicantRegisterDialog";
import ApplicantLoginDialog from "@/components/auth/ApplicantLoginDialog";
import RecruiterRegisterDialog from "@/components/auth/RecruiterRegisterDialog";
import RecruiterLoginDialog from "@/components/auth/RecruiterLoginDialog";
import {
  authAPI,
  getStoredAuthToken,
  getTokenInfo,
  removeAuthToken,
} from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext.minimal";

export function Header() {
  const navItems = [
    {
      name: "About",
      link: "#about",
    },
    {
      name: "How It Works",
      link: "#how-it-works",
    },
    {
      name: "Contact",
      link: "#contact",
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Use AuthContext to get authentication state
  const { user, session, loading: authLoading } = useAuth();

  const [isApplicantRegisterOpen, setIsApplicantRegisterOpen] = useState(false);
  const [isApplicantLoginOpen, setIsApplicantLoginOpen] = useState(false);

  const [isRecruiterRegisterOpen, setIsRecruiterRegisterOpen] = useState(false);
  const [isRecruiterLoginOpen, setIsRecruiterLoginOpen] = useState(false);

  // Check if user is logged in on component mount and when auth state changes
  useEffect(() => {
    const checkAuthStatus = () => {
      // If AuthContext is still loading, don't make auth decisions yet
      if (authLoading) {
        console.log("AuthContext is still loading, waiting...");
        // But allow UI to be interactive, just don't determine auth state
        return;
      }

      // If we have a Supabase session, assume we're logged in
      // (AuthContext will handle token exchange)
      if (session && user) {
        console.log(
          "User authenticated via Supabase, checking backend token..."
        );
        setIsLoggedIn(true);
        return;
      }

      // Check for backend JWT token
      const token = getStoredAuthToken();
      console.log("Checking auth status. Token found:", !!token);

      if (token) {
        console.log("Token exists:", token.substring(0, 20) + "...");

        // Validate token format and expiration
        try {
          const tokenInfo = getTokenInfo(token);
          if (tokenInfo) {
            const isExpired = tokenInfo.exp * 1000 < Date.now();
            console.log("Token validation:", {
              expiresAt: new Date(tokenInfo.exp * 1000).toLocaleString(),
              timeLeft: tokenInfo.timeLeft,
              isExpired: isExpired,
            });

            if (isExpired) {
              console.log("Token is expired, clearing and setting logged out");
              removeAuthToken();
              setIsLoggedIn(false);

              // Show expiration toast
              toast.error("Sesi telah berakhir", {
                description: "Silakan login kembali untuk melanjutkan.",
              });
              return;
            }

            // Token is valid
            setIsLoggedIn(true);
          } else {
            console.log(
              "Invalid token format, clearing and setting logged out"
            );
            removeAuthToken();
            setIsLoggedIn(false);
          }
        } catch (error) {
          console.error("Error validating token:", error);
          removeAuthToken();
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
    };

    // Check on mount and when auth context changes
    checkAuthStatus();

    // Set up periodic token validation (every 5 minutes)
    const tokenValidationInterval = setInterval(() => {
      if (!authLoading) {
        const token = getStoredAuthToken();
        if (token) {
          console.log("Periodic token validation check");
          checkAuthStatus();
        }
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Set up event listener for storage changes (in case of login/logout in another tab)
    const handleStorageChange = () => {
      if (!authLoading) {
        console.log("Storage changed, rechecking auth status");
        checkAuthStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for auth state changes within the app
    const handleAuthChange = () => {
      if (!authLoading) {
        console.log("Auth state changed event received");
        checkAuthStatus();
      }
    };

    window.addEventListener("authStateChanged", handleAuthChange);

    return () => {
      clearInterval(tokenValidationInterval);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("authStateChanged", handleAuthChange);
    };
  }, [session, user, authLoading]); // React to AuthContext changes

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      console.log("Starting logout process...");

      // Step 1: Logout from backend API
      const response = await authAPI.logout();
      console.log("Backend logout response:", response);

      // Step 2: Logout from Supabase (if user has Supabase session)
      if (session || user) {
        console.log("Logging out from Supabase...");
        try {
          const { signOut } = await import("@/lib/supabase");
          await signOut();
          console.log("Supabase logout successful");
        } catch (supabaseError) {
          console.error("Supabase logout failed:", supabaseError);
          // Continue with logout even if Supabase fails
        }
      }

      // Step 3: Force clear all tokens and storage
      console.log("Force clearing all authentication data...");
      removeAuthToken();

      // Clear additional storage keys that might persist
      if (typeof window !== "undefined") {
        localStorage.removeItem("authToken");
        localStorage.removeItem("auth_token");
        localStorage.removeItem("supabase.auth.token");
        sessionStorage.clear(); // Clear session storage too
      }

      // Step 4: Dispatch auth state change and redirect
      window.dispatchEvent(new Event("authStateChanged"));

      if (response.status === "success" || response.status === "error") {
        // Redirect regardless of backend response (local logout is successful)
        toast.success("Logout berhasil", {
          description: "Anda telah berhasil keluar.",
        });
        window.location.href = "/";
      } else {
        toast.error("Gagal keluar", {
          description: response.message || "Terjadi kesalahan saat keluar.",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);

      // Even if there's an error, force local logout
      console.log("Force logout due to error...");
      removeAuthToken();
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }

      toast.success("Logout berhasil", {
        description: "Anda telah berhasil keluar secara lokal.",
      });
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative w-full mt-4">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-2">
            {authLoading ? (
              // Show loading state
              <div className="flex items-center gap-2">
                <div className="w-20 h-8 bg-muted animate-pulse rounded-full"></div>
                <div className="w-32 h-8 bg-muted animate-pulse rounded-full"></div>
              </div>
            ) : isLoggedIn ? (
              <NavbarButton
                variant="primary"
                className="rounded-full flex items-center gap-1"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Keluar..." : "Keluar"}
              </NavbarButton>
            ) : (
              // Show register/login options when not logged in
              <>
                <NavbarButton
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setIsApplicantLoginOpen(true)}
                >
                  Login
                </NavbarButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <NavbarButton
                      variant="primary"
                      className="bg-primary text-accent rounded-full flex items-center gap-1"
                    >
                      Mulai Sekarang!
                      <ChevronDown className="w-4 h-4" />
                    </NavbarButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem
                      onClick={() => setIsApplicantRegisterOpen(true)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-4 h-4" />
                      Daftar sebagai IT Talent
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsRecruiterRegisterOpen(true)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-4 h-4" />
                      Daftar sebagai Recruiter
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {/* Dialog Components */}
            <ApplicantRegisterDialog
              open={isApplicantRegisterOpen}
              onOpenChange={setIsApplicantRegisterOpen}
              onShowLogin={() => {
                setIsApplicantRegisterOpen(false);
                setTimeout(() => setIsApplicantLoginOpen(true), 100);
              }}
            />
            <ApplicantLoginDialog
              open={isApplicantLoginOpen}
              onOpenChange={setIsApplicantLoginOpen}
              onShowRegister={() => {
                setIsApplicantLoginOpen(false);
                setTimeout(() => setIsApplicantRegisterOpen(true), 100);
              }}
            />
            <RecruiterRegisterDialog
              open={isRecruiterRegisterOpen}
              onOpenChange={setIsRecruiterRegisterOpen}
              onShowLogin={() => {
                setIsRecruiterRegisterOpen(false);
                setTimeout(() => setIsRecruiterLoginOpen(true), 100);
              }}
            />
            <RecruiterLoginDialog
              open={isRecruiterLoginOpen}
              onOpenChange={setIsRecruiterLoginOpen}
              onShowRegister={() => {
                setIsRecruiterLoginOpen(false);
                setTimeout(() => setIsRecruiterRegisterOpen(true), 100);
              }}
            />
          </div>
        </NavBody>

        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.map((item, idx) => (
              <a
                key={`mobile-link-${idx}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-600 dark:text-neutral-300 items-center justify-center text-center"
              >
                <span className="block text-center">{item.name}</span>
              </a>
            ))}
            <div className="flex w-full flex-col gap-4">
              {authLoading ? (
                // Mobile loading state
                <div className="grid grid-cols-1 gap-2">
                  <div className="w-full h-10 bg-muted animate-pulse rounded-full"></div>
                  <div className="w-full h-10 bg-muted animate-pulse rounded-full"></div>
                </div>
              ) : isLoggedIn ? (
                // Mobile logout button
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={isLoggingOut}
                  className="w-full rounded-full flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? "Keluar..." : "Keluar"}
                </Button>
              ) : (
                // Mobile Register/Login Buttons
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsApplicantLoginOpen(true);
                    }}
                    className="w-full rounded-full"
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsApplicantRegisterOpen(true);
                    }}
                    className="w-full bg-primary text-accent rounded-full flex items-center gap-2"
                  >
                    Daftar sebagai IT Talent
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsRecruiterRegisterOpen(true);
                    }}
                    className="w-full rounded-full flex items-center gap-2"
                  >
                    Daftar sebagai Recruiter
                  </Button>
                </div>
              )}
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
