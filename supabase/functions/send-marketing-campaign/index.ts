import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Target {
  phone: string;
  name: string;
  unit_id: string;
}

interface RequestBody {
  message_template: string;
  targets: Target[];
  unit_id: string;
  media_url?: string;
  media_type?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nMarketingUrl = Deno.env.get("N8N_MARKETING_URL");

    if (!n8nMarketingUrl) {
      console.error("N8N_MARKETING_URL not configured");
      return new Response(
        JSON.stringify({ error: "Webhook de marketing não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user's JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} sending marketing campaign`);

    // Parse and validate request body
    const body: RequestBody = await req.json();
    const { message_template, targets, unit_id, media_url, media_type } = body;

    if (!message_template || !targets || targets.length === 0 || !unit_id) {
      return new Response(
        JSON.stringify({ error: "Dados inválidos. Forneça message_template, targets e unit_id." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate message template length
    if (message_template.length > 2000) {
      return new Response(
        JSON.stringify({ error: "Mensagem muito longa. Máximo de 2000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit number of recipients per campaign
    if (targets.length > 500) {
      return new Response(
        JSON.stringify({ error: "Máximo de 500 destinatários por campanha." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate media_url if provided (must be HTTPS)
    if (media_url && !media_url.startsWith("https://")) {
      return new Response(
        JSON.stringify({ error: "URL de mídia deve usar HTTPS." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone numbers - must contain only digits after cleanup, 10-11 digits (Brazilian format)
    const invalidPhones = targets.filter((t) => {
      const clean = t.phone.replace(/\D/g, "").replace(/^55/, "");
      return clean.length < 10 || clean.length > 11;
    });
    if (invalidPhones.length > 0) {
      return new Response(
        JSON.stringify({ error: `${invalidPhones.length} número(s) de telefone inválido(s).` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch unit data with WhatsApp credentials
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("id, name, evolution_instance_name, evolution_api_key, company_id, user_id")
      .eq("id", unit_id)
      .single();

    if (unitError || !unit) {
      console.error("Error fetching unit:", unitError?.message);
      return new Response(
        JSON.stringify({ error: "Unidade não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns this unit
    if (unit.user_id !== user.id) {
      console.error("User does not own this unit");
      return new Response(
        JSON.stringify({ error: "Sem permissão para esta unidade" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if unit has WhatsApp configured
    if (!unit.evolution_instance_name || !unit.evolution_api_key) {
      console.error("Unit has no WhatsApp configured:", unit.id);
      return new Response(
        JSON.stringify({ 
          error: `WhatsApp não configurado para a unidade "${unit.name}". Configure em Unidades > WhatsApp.` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch opted-out clients to filter them
    const { data: optedOutClients } = await supabase
      .from("clients")
      .select("phone")
      .eq("company_id", unit.company_id)
      .eq("marketing_opt_out", true);

    const optedOutPhones = new Set(
      (optedOutClients || []).map((c: { phone: string }) => 
        c.phone.replace(/\D/g, "").replace(/^55/, "")
      )
    );

    // Filter targets, removing opted-out clients
    const filteredTargets = targets.filter((t) => {
      const normalizedPhone = t.phone.replace(/\D/g, "").replace(/^55/, "");
      const isOptedOut = optedOutPhones.has(normalizedPhone);
      if (isOptedOut) {
        console.log(`Skipping opted-out client: ${t.name} (${t.phone})`);
      }
      return !isOptedOut;
    });

    if (filteredTargets.length === 0) {
      console.log("All targets have opted out");
      return new Response(
        JSON.stringify({ 
          error: "Todos os destinatários selecionados fizeram opt-out e não receberão mensagens de marketing" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const skippedCount = targets.length - filteredTargets.length;
    if (skippedCount > 0) {
      console.log(`Filtered out ${skippedCount} opted-out clients`);
    }

    console.log(`Creating campaign for unit ${unit.name} with ${filteredTargets.length} targets (${skippedCount} skipped due to opt-out)`);

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .insert({
        company_id: unit.company_id,
        unit_id: unit_id,
        message_template,
        media_url: media_url || null,
        media_type: media_type || null,
        total_recipients: filteredTargets.length,
        status: "processing",
        created_by: user.id,
      })
      .select()
      .single();

    if (campaignError || !campaign) {
      console.error("Error creating campaign:", campaignError?.message);
      return new Response(
        JSON.stringify({ error: "Erro ao criar campanha" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Campaign ${campaign.id} created`);

    // Create message logs for each target
    const logs = filteredTargets.map((t) => ({
      campaign_id: campaign.id,
      recipient_phone: t.phone,
      recipient_name: t.name,
      recipient_type: "client",
      status: "pending",
    }));

    const { data: insertedLogs, error: logsError } = await supabase
      .from("campaign_message_logs")
      .insert(logs)
      .select("id, recipient_phone");

    if (logsError) {
      console.error("Error creating logs:", logsError.message);
      // Update campaign to failed
      await supabase
        .from("marketing_campaigns")
        .update({ status: "failed" })
        .eq("id", campaign.id);
      return new Response(
        JSON.stringify({ error: "Erro ao criar logs de envio" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created ${insertedLogs?.length} message logs`);

    // Build contacts array with log IDs for callback
    const contacts = filteredTargets.map((t) => {
      const log = insertedLogs?.find((l) => l.recipient_phone === t.phone);
      // Remove non-digits, remove leading 55 if present, then add 55 prefix
      const cleanNumber = t.phone.replace(/\D/g, "").replace(/^55/, "");
      return {
        number: "55" + cleanNumber,
        text: message_template.replace(/\{\{nome\}\}/g, t.name),
        log_id: log?.id || null,
      };
    });

    // Secret for callback validation - loaded from environment variable
    const callbackSecret = Deno.env.get("N8N_CALLBACK_SECRET");

    // Build n8n payload matching the workflow format
    const n8nPayload = {
      instanceName: unit.evolution_instance_name,
      api_key: unit.evolution_api_key,
      mediaUrl: media_url || "",
      mediaType: media_type || "",
      contacts,
      campaign_id: campaign.id,
      callback_url: `${supabaseUrl}/functions/v1/campaign-callback`,
      update_status_url: `${supabaseUrl}/functions/v1/update-campaign-status`,
      check_status_url: `${supabaseUrl}/functions/v1/check-campaign-status`,
      callback_secret: callbackSecret,
    };

    console.log(`Sending to n8n webhook with ${contacts.length} contacts`);

    // Send to n8n webhook
    const n8nResponse = await fetch(n8nMarketingUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error("n8n webhook error:", n8nResponse.status, errorText);
      
      // Update campaign to failed
      await supabase
        .from("marketing_campaigns")
        .update({ status: "failed" })
        .eq("id", campaign.id);

      return new Response(
        JSON.stringify({ error: "Erro ao enviar para o webhook de marketing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Campaign sent successfully to n8n");

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaign_id: campaign.id,
        message: `Campanha iniciada para ${filteredTargets.length} contato(s)${skippedCount > 0 ? ` (${skippedCount} ignorados por opt-out)` : ''}. Processando em segundo plano...` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
