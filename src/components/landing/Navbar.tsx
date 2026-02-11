import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Scissors, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Block body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-2 rounded-lg bg-gold/10 group-hover:bg-gold/20 transition-colors">
                <Scissors className="h-6 w-6 text-gold" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Barber<span className="text-gold">Soft</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("funcionalidades")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Funcionalidades
              </button>
              <button
                onClick={() => scrollToSection("precos")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Preços
              </button>
              <button
                onClick={() => scrollToSection("depoimentos")}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Depoimentos
              </button>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button className="bg-gold hover:bg-gold/90 text-black font-semibold glow-gold" onClick={() => scrollToSection("precos")}>
                Conheça os Planos
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 relative z-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Fullscreen Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-fade-in">
          {/* Solid dark background */}
          <div className="absolute inset-0 bg-background" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header with logo */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
              <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="p-2 rounded-lg bg-gold/10">
                  <Scissors className="h-6 w-6 text-gold" />
                </div>
                <span className="text-xl font-bold text-foreground">
                  Barber<span className="text-gold">Soft</span>
                </span>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2"
                aria-label="Fechar menu"
              >
                <X className="h-6 w-6 text-foreground" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="flex flex-col px-6 pt-8 gap-6 flex-1">
              <button
                onClick={() => scrollToSection("funcionalidades")}
                className="text-xl text-foreground hover:text-gold transition-colors text-left py-2"
              >
                Funcionalidades
              </button>
              <button
                onClick={() => scrollToSection("precos")}
                className="text-xl text-foreground hover:text-gold transition-colors text-left py-2"
              >
                Preços
              </button>
              <button
                onClick={() => scrollToSection("depoimentos")}
                className="text-xl text-foreground hover:text-gold transition-colors text-left py-2"
              >
                Depoimentos
              </button>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-6 mt-auto mb-8">
                <Button variant="outline" asChild className="w-full justify-center h-12 text-base">
                  <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>Entrar</Link>
                </Button>
                <Button 
                  className="w-full bg-gold hover:bg-gold/90 text-black font-semibold h-12 text-base glow-gold" 
                  onClick={() => scrollToSection("precos")}
                >
                  Conheça os Planos
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
