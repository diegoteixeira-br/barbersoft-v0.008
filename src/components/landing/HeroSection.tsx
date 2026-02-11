import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { ChatSimulation } from "./ChatSimulation";
import { DashboardPreview } from "./DashboardPreview";
import { DemoTourModal } from "./DemoTourModal";
import { useNavigate } from "react-router-dom";
import heroVideo from "@/assets/hero-barbershop-video.mp4";

export function HeroSection() {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="min-h-screen pt-24 pb-16 flex items-center relative overflow-hidden">
      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source 
            src={heroVideo} 
            type="video/mp4" 
          />
        </video>
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-black/70" />
        {/* Gradient overlay to blend with page */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
      </div>

      <div className="container mx-auto px-6 sm:px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs sm:text-sm text-gold">Sistema completo de gestão para barbearias</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6 animate-fade-in">
              Gestão completa da sua barbearia.{" "}
              <span className="text-gold">Do agendamento ao financeiro.</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-in">
              Agenda, financeiro, comissões, clientes, estoque e marketing.{" "}
              <span className="text-foreground">
                Tudo integrado com WhatsApp para automatizar seu atendimento.
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start animate-fade-in">
              <Button
                size="lg"
                className="bg-gold hover:bg-gold/90 text-black font-bold text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 glow-gold animate-pulse-subtle group w-full sm:w-auto"
                onClick={() => document.getElementById("precos")?.scrollIntoView({ behavior: "smooth" })}
              >
                Conheça os Planos
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-border/50 hover:bg-muted/50 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
                onClick={() => setDemoOpen(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-6 text-muted-foreground text-sm animate-fade-in">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>7 dias grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Suporte humanizado</span>
              </div>
            </div>
          </div>

          {/* Mockups - Esconder notebook em mobile, mostrar apenas chat centralizado */}
          <div className="relative animate-fade-in mt-8 lg:mt-0">
            {/* Notebook Mockup - Esconder em mobile/tablet */}
            <div className="hidden lg:block relative z-10 bg-charcoal rounded-lg p-2 shadow-2xl border border-border/30 transform hover:scale-[1.02] transition-transform duration-300">
              <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/30">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="aspect-video bg-background rounded overflow-hidden">
                <DashboardPreview />
              </div>
            </div>

            {/* Phone Mockup with Chat - Centralizado em mobile */}
            <div className="lg:absolute lg:-right-4 lg:-bottom-8 w-full max-w-xs mx-auto lg:w-64 z-20 transform hover:scale-105 transition-transform duration-300">
              <ChatSimulation />
            </div>

            {/* Decorative Elements - Esconder em mobile */}
            <div className="hidden lg:block absolute -top-4 -left-4 w-24 h-24 bg-gold/20 rounded-full blur-xl" />
            <div className="hidden lg:block absolute -bottom-4 -right-4 w-32 h-32 bg-orange-neon/20 rounded-full blur-xl" />
          </div>
        </div>
      </div>

      <DemoTourModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}
