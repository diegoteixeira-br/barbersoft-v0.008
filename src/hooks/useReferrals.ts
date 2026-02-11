import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export function useReferrals() {
  const { company } = useCompany();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["referrals", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .or(`referrer_company_id.eq.${company.id},referred_company_id.eq.${company.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id,
  });

  const totalReferrals = referrals.filter(r => r.referrer_company_id === company?.id).length;
  const completedReferrals = referrals.filter(
    r => r.referrer_company_id === company?.id && r.status === "completed"
  ).length;
  const pendingReferrals = totalReferrals - completedReferrals;
  const monthsEarned = completedReferrals;

  return {
    referrals,
    referralCode: company?.referral_code || "",
    totalReferrals,
    completedReferrals,
    pendingReferrals,
    monthsEarned,
    isLoading,
  };
}
