import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Company {
  id: string;
  name: string;
  evolution_instance_name: string | null;
  evolution_api_key: string | null;
  owner_user_id: string;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
}

interface CompanyFormData {
  name?: string;
  evolution_instance_name?: string | null;
  evolution_api_key?: string | null;
}

export function useCompany() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: company, isLoading, isFetched, isError } = useQuery({
    queryKey: ["company"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Use order + limit to handle multiple companies gracefully (picks oldest)
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Company | null;
    },
  });

  const createCompany = useMutation({
    mutationFn: async (companyData: { name: string; plan_type?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Calculate trial end date (7 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      const { data, error } = await supabase
        .from("companies")
        .insert({ 
          name: companyData.name, 
          owner_user_id: user.id,
          plan_status: "trial",
          plan_type: companyData.plan_type || "profissional",
          trial_ends_at: trialEndsAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({ title: "Empresa criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar empresa", description: error.message, variant: "destructive" });
    },
  });

  const updateCompany = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const { data: updated, error } = await supabase
        .from("companies")
        .update(data)
        .eq("id", company.id)
        .select()
        .single();

      if (error) throw error;
      return updated as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company"] });
      toast({ title: "Empresa atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar empresa", description: error.message, variant: "destructive" });
    },
  });

  return {
    company,
    isLoading,
    isFetched,
    isError,
    createCompany,
    updateCompany,
  };
}
