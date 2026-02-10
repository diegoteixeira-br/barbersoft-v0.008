import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Smartphone, CreditCard, Gift, Split } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isSplitPayment, parseSplitPayment, formatSplitPayment, getMethodLabel } from "@/utils/splitPayment";

export type PaymentMethod = "cash" | "pix" | "debit_card" | "credit_card" | "courtesy" | "fidelity_courtesy";

interface PaymentMethodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paymentMethod: PaymentMethod, courtesyReason?: string) => void;
  totalPrice: number;
  isLoading?: boolean;
  availableCourtesies?: number;
  onUseFidelityCourtesy?: () => void;
  isFreeCut?: boolean;
  loyaltyCuts?: number;
  loyaltyThreshold?: number;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType; color: string }[] = [
  { value: "cash", label: "Dinheiro", icon: Banknote, color: "text-green-500 bg-green-500/10 border-green-500/30 hover:bg-green-500/20" },
  { value: "pix", label: "PIX", icon: Smartphone, color: "text-blue-500 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" },
  { value: "debit_card", label: "Débito", icon: CreditCard, color: "text-orange-500 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20" },
  { value: "credit_card", label: "Crédito", icon: CreditCard, color: "text-purple-500 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20" },
  { value: "courtesy", label: "Cortesia", icon: Gift, color: "text-pink-500 bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20" },
];

const splitablePaymentMethods = paymentMethods.filter(
  (m) => m.value !== "courtesy"
);

export function PaymentMethodModal({
  open,
  onOpenChange,
  onConfirm,
  totalPrice,
  isLoading,
  availableCourtesies = 0,
  onUseFidelityCourtesy,
  isFreeCut = false,
  loyaltyCuts = 0,
  loyaltyThreshold = 5,
}: PaymentMethodModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [courtesyReason, setCourtesyReason] = useState("");

  // Split payment state
  const [isSplit, setIsSplit] = useState(false);
  const [splitMethod1, setSplitMethod1] = useState<string>("cash");
  const [splitMethod2, setSplitMethod2] = useState<string>("pix");
  const [splitAmount1, setSplitAmount1] = useState<string>("");
  const [splitAmount2, setSplitAmount2] = useState<string>("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Auto-calculate amount2 when amount1 changes
  useEffect(() => {
    if (isSplit && splitAmount1 !== "") {
      const val1 = parseFloat(splitAmount1) || 0;
      const remaining = Math.max(0, totalPrice - val1);
      setSplitAmount2(remaining.toFixed(2));
    }
  }, [splitAmount1, totalPrice, isSplit]);

  const getSplitValidation = () => {
    const val1 = parseFloat(splitAmount1) || 0;
    const val2 = parseFloat(splitAmount2) || 0;
    const sum = val1 + val2;
    const isValidSum = Math.abs(sum - totalPrice) < 0.01;
    const bothPositive = val1 > 0 && val2 > 0;
    const differentMethods = splitMethod1 !== splitMethod2;
    return { isValid: isValidSum && bothPositive && differentMethods, val1, val2, sum };
  };

  const handleConfirm = () => {
    if (isSplit) {
      const { isValid, val1, val2 } = getSplitValidation();
      if (!isValid) return;
      const splitString = formatSplitPayment(splitMethod1, val1, splitMethod2, val2);
      // Cast as PaymentMethod since the downstream just stores the string
      onConfirm(splitString as unknown as PaymentMethod);
      resetState();
      return;
    }

    if (selectedMethod) {
      if (selectedMethod === "fidelity_courtesy" && onUseFidelityCourtesy) {
        onUseFidelityCourtesy();
      }
      onConfirm(selectedMethod, selectedMethod === "courtesy" ? courtesyReason.trim() : undefined);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedMethod(null);
    setCourtesyReason("");
    setIsSplit(false);
    setSplitAmount1("");
    setSplitAmount2("");
    setSplitMethod1("cash");
    setSplitMethod2("pix");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const toggleSplit = () => {
    setIsSplit((prev) => {
      if (!prev) {
        setSelectedMethod(null);
      }
      return !prev;
    });
  };

  const isCourtesyValid = selectedMethod !== "courtesy" || courtesyReason.trim().length > 0;
  const isFidelityCourtesy = selectedMethod === "fidelity_courtesy";
  const { isValid: isSplitValid } = isSplit ? getSplitValidation() : { isValid: false };

  const canConfirm = isSplit
    ? isSplitValid
    : selectedMethod && isCourtesyValid;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Forma de Pagamento
          </DialogTitle>
          <DialogDescription>
            Selecione como o cliente vai pagar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* FREE CUT Alert */}
          {isFreeCut && (
            <div className="rounded-lg border-2 border-green-500 bg-green-500/10 p-4 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-green-500" />
                <span className="text-lg font-bold text-green-500">🎉 CORTE GRÁTIS!</span>
                <Gift className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm text-green-400">
                {loyaltyThreshold} cortes pagos! Este é o {loyaltyThreshold + 1}º corte - CORTESIA!
              </p>
            </div>
          )}

          {/* Fidelity Courtesy Option */}
          {(availableCourtesies > 0 || isFreeCut) && !isSplit && (
            <button
              type="button"
              onClick={() => setSelectedMethod("fidelity_courtesy")}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border-2 p-4 transition-all",
                isFreeCut 
                  ? "bg-green-500/20 border-green-500 hover:bg-green-500/30 animate-pulse" 
                  : "bg-green-500/10 border-green-500/30 hover:bg-green-500/20",
                selectedMethod === "fidelity_courtesy" && "ring-2 ring-green-500 ring-offset-2 ring-offset-background"
              )}
            >
              <div className="p-2 rounded-full bg-green-500/20">
                <Gift className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-green-400">
                  {isFreeCut ? "✨ Usar Cortesia de Fidelidade ✨" : "Usar Cortesia de Fidelidade"}
                </p>
                <p className="text-xs text-green-400/70">
                  {isFreeCut 
                    ? `Prêmio por ${loyaltyThreshold} cortes pagos!`
                    : `${availableCourtesies} cortesia${availableCourtesies > 1 ? "s" : ""} disponível`
                  }
                </p>
              </div>
              <span className="text-green-400 font-bold">GRÁTIS</span>
            </button>
          )}

          {/* Valor */}
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">Valor a receber</p>
            <p className="text-2xl font-bold text-foreground">
              {selectedMethod === "courtesy" || isFidelityCourtesy ? formatCurrency(0) : formatCurrency(totalPrice)}
            </p>
            {selectedMethod === "courtesy" && (
              <p className="text-xs text-pink-500 mt-1">Serviço oferecido como cortesia</p>
            )}
            {isFidelityCourtesy && (
              <p className="text-xs text-green-500 mt-1">
                {isFreeCut ? `🎉 Prêmio por ${loyaltyThreshold} cortes pagos!` : "Cortesia de fidelidade"}
              </p>
            )}
          </div>

          {/* Courtesy Reason Field */}
          {selectedMethod === "courtesy" && !isSplit && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Motivo da cortesia <span className="text-destructive">*</span>
              </label>
              <Textarea
                placeholder="Ex: Cliente fidelizado, promoção especial, compensação por atraso..."
                value={courtesyReason}
                onChange={(e) => setCourtesyReason(e.target.value)}
                className="min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground text-right">
                {courtesyReason.length}/200
              </p>
            </div>
          )}

          {/* Split Payment Mode */}
          {isSplit ? (
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Dividir Pagamento</p>
                <Button variant="ghost" size="sm" onClick={toggleSplit} className="text-xs">
                  Cancelar divisão
                </Button>
              </div>

              {/* Split Line 1 */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Método 1</Label>
                  <Select value={splitMethod1} onValueChange={setSplitMethod1}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {splitablePaymentMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value} disabled={m.value === splitMethod2}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalPrice}
                    placeholder="0,00"
                    value={splitAmount1}
                    onChange={(e) => setSplitAmount1(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Split Line 2 */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Método 2</Label>
                  <Select value={splitMethod2} onValueChange={setSplitMethod2}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {splitablePaymentMethods.map((m) => (
                        <SelectItem key={m.value} value={m.value} disabled={m.value === splitMethod1}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1">
                  <Label className="text-xs">Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalPrice}
                    placeholder="0,00"
                    value={splitAmount2}
                    onChange={(e) => setSplitAmount2(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Validation message */}
              {splitAmount1 !== "" && splitAmount2 !== "" && !isSplitValid && (
                <p className="text-xs text-destructive">
                  {splitMethod1 === splitMethod2
                    ? "Os métodos precisam ser diferentes"
                    : `A soma (${formatCurrency(parseFloat(splitAmount1 || "0") + parseFloat(splitAmount2 || "0"))}) deve ser igual ao total (${formatCurrency(totalPrice)})`}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Payment Methods Grid */}
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = selectedMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setSelectedMethod(method.value)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 transition-all",
                        method.color,
                        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      <Icon className="h-8 w-8" />
                      <span className="font-medium">{method.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Split Payment Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSplit}
                className="w-full gap-2"
              >
                <Split className="h-4 w-4" />
                Dividir Pagamento
              </Button>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm || isLoading}
              className="flex-1"
            >
              {isLoading ? "Finalizando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for displaying payment method badge
export function PaymentBadge({ method }: { method: string | null }) {
  if (!method) return <span className="text-muted-foreground">-</span>;

  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    cash: { label: "Dinheiro", icon: Banknote, className: "bg-green-500/10 text-green-500" },
    pix: { label: "PIX", icon: Smartphone, className: "bg-blue-500/10 text-blue-500" },
    debit_card: { label: "Débito", icon: CreditCard, className: "bg-orange-500/10 text-orange-500" },
    credit_card: { label: "Crédito", icon: CreditCard, className: "bg-purple-500/10 text-purple-500" },
    courtesy: { label: "Cortesia", icon: Gift, className: "bg-pink-500/10 text-pink-500" },
    fidelity_courtesy: { label: "Fidelidade", icon: Gift, className: "bg-green-500/10 text-green-500" },
  };

  // Split payment detection
  if (isSplitPayment(method)) {
    const parts = parseSplitPayment(method);
    const formatValue = (v: number) =>
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    return (
      <div className="flex flex-wrap gap-1">
        {parts.map((part, idx) => {
          const partConfig = config[part.method];
          if (!partConfig) return null;
          const Icon = partConfig.icon;
          return (
            <span
              key={idx}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                partConfig.className
              )}
            >
              <Icon className="h-3 w-3" />
              {partConfig.label} {formatValue(part.amount)}
            </span>
          );
        })}
      </div>
    );
  }

  const methodConfig = config[method];
  if (!methodConfig) return <span className="text-muted-foreground">{method}</span>;

  const Icon = methodConfig.icon;

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", methodConfig.className)}>
      <Icon className="h-3 w-3" />
      {methodConfig.label}
    </span>
  );
}
