// Utility for parsing and creating split payment strings
// Format: "method1:amount1|method2:amount2" (e.g., "cash:20.00|pix:45.00")

export interface SplitPaymentPart {
  method: string;
  amount: number;
}

export function isSplitPayment(paymentMethod: string | null): boolean {
  return !!paymentMethod && paymentMethod.includes("|");
}

export function parseSplitPayment(paymentMethod: string | null): SplitPaymentPart[] {
  if (!paymentMethod) return [];
  
  if (!isSplitPayment(paymentMethod)) {
    return [{ method: paymentMethod, amount: 0 }]; // amount 0 means "use total_price"
  }

  return paymentMethod.split("|").map((part) => {
    const [method, amountStr] = part.split(":");
    return { method, amount: parseFloat(amountStr) || 0 };
  });
}

export function formatSplitPayment(method1: string, amount1: number, method2: string, amount2: number): string {
  return `${method1}:${amount1.toFixed(2)}|${method2}:${amount2.toFixed(2)}`;
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  debit_card: "Débito",
  credit_card: "Crédito",
  courtesy: "Cortesia",
  fidelity_courtesy: "Fidelidade",
};

export function getMethodLabel(method: string): string {
  return METHOD_LABELS[method] || method;
}

/**
 * For financial breakdowns: distributes a split payment's amounts to the correct methods.
 * For non-split payments, assigns the full total_price to the single method.
 */
export function getPaymentDistribution(
  paymentMethod: string | null,
  totalPrice: number
): SplitPaymentPart[] {
  if (!paymentMethod) return [{ method: "cash", amount: totalPrice }];

  if (isSplitPayment(paymentMethod)) {
    return parseSplitPayment(paymentMethod);
  }

  return [{ method: paymentMethod, amount: totalPrice }];
}
