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
import RegisterDialog from "@/components/auth/registerDialog";
import LoginDialog from "@/components/auth/loginDialog";

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
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);

  return (
    <div className="relative w-full mt-4">
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="flex items-center gap-4">
            <RegisterDialog
              open={isRegisterDialogOpen}
              onOpenChange={setIsRegisterDialogOpen}
              onShowLogin={() => setIsLoginDialogOpen(true)}
              trigger={
                <NavbarButton
                  variant="primary"
                  className="bg-primary text-accent rounded-full"
                  onClick={() => setIsRegisterDialogOpen(true)}
                >
                  Mulai Sekarang!
                </NavbarButton>
              }
            />
            <LoginDialog
              open={isLoginDialogOpen}
              onOpenChange={setIsLoginDialogOpen}
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
              <RegisterDialog
                open={isRegisterDialogOpen}
                onOpenChange={setIsRegisterDialogOpen}
                onShowLogin={() => setIsLoginDialogOpen(true)}
                trigger={
                  <NavbarButton
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsRegisterDialogOpen(true);
                    }}
                    variant="primary"
                    className="w-full bg-primary text-accent rounded-full"
                  >
                    Mulai Sekarang!
                  </NavbarButton>
                }
              />
              <LoginDialog
                open={isLoginDialogOpen}
                onOpenChange={setIsLoginDialogOpen}
              />
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>
    </div>
  );
}
