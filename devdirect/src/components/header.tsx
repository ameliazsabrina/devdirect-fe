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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, User, Building2 } from "lucide-react";
import ApplicantRegisterDialog from "@/components/auth/ApplicantRegisterDialog";
import ApplicantLoginDialog from "@/components/auth/ApplicantLoginDialog";
import RecruiterRegisterDialog from "@/components/auth/RecruiterRegisterDialog";
import RecruiterLoginDialog from "@/components/auth/RecruiterLoginDialog";

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

  const [isApplicantRegisterOpen, setIsApplicantRegisterOpen] = useState(false);
  const [isApplicantLoginOpen, setIsApplicantLoginOpen] = useState(false);

  const [isRecruiterRegisterOpen, setIsRecruiterRegisterOpen] = useState(false);
  const [isRecruiterLoginOpen, setIsRecruiterLoginOpen] = useState(false);

  return (
    <div className="relative w-full mt-4">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-2">
            {/* Register Dropdown */}
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
              {/* Mobile Register Buttons */}
              <div className="grid grid-cols-1 gap-2">
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
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
