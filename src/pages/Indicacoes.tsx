import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReferralCard } from "@/components/referral/ReferralCard";
import { SEOHead } from "@/components/seo/SEOHead";

export default function Indicacoes() {
  return (
    <DashboardLayout>
      <SEOHead
        title="Indique e Ganhe | BarberSoft"
        description="Convide amigos e ganhe meses grátis no BarberSoft."
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Indique e Ganhe</h1>
          <p className="mt-1 text-muted-foreground">
            Convide amigos barbeiros e ganhe 1 mês grátis para cada indicação que pagar.
          </p>
        </div>
        <div className="max-w-2xl">
          <ReferralCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
