import { useState } from "react";
import { Copy, Check, Share2, Gift, Users, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useReferrals } from "@/hooks/useReferrals";
import { Skeleton } from "@/components/ui/skeleton";

export function ReferralCard() {
  const { toast } = useToast();
  const { referralCode, totalReferrals, completedReferrals, pendingReferrals, monthsEarned, isLoading } = useReferrals();
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/auth?tab=signup&ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({ title: "Link copiado!", description: "Compartilhe com seus amigos." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `🔥 Experimente o BarberSoft! Gerencie sua barbearia de forma profissional. Use meu link e nós dois ganhamos 1 mês grátis: ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  if (isLoading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Indique e Ganhe</CardTitle>
        </div>
        <CardDescription>
          Convide amigos e ganhe <span className="font-semibold text-primary">1 mês grátis</span> para cada indicação que realizar o primeiro pagamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Seu link de indicação</label>
          <div className="flex gap-2">
            <Input
              value={referralLink}
              readOnly
              className="bg-secondary/50 text-sm font-mono"
            />
            <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleCopy} variant="outline" className="flex-1 gap-2">
            <Copy className="mr-2 h-4 w-4" />
            Copiar Link
          </Button>
          <Button onClick={handleWhatsApp} className="flex-1 bg-accent hover:bg-accent/90">
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <Users className="mx-auto mb-1 h-5 w-5 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalReferrals}</p>
            <p className="text-xs text-muted-foreground">Indicados</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <Award className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-primary">{completedReferrals}</p>
            <p className="text-xs text-muted-foreground">Convertidos</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center">
            <Gift className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-primary">{monthsEarned}</p>
            <p className="text-xs text-muted-foreground">Meses ganhos</p>
          </div>
        </div>

        {pendingReferrals > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              {pendingReferrals} pendente{pendingReferrals > 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">Aguardando primeiro pagamento</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
