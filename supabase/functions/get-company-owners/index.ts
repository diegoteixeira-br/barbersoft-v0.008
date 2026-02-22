import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the requesting user is a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all companies
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from("companies")
      .select("id, owner_user_id")
      .order("created_at", { ascending: false });

    if (companiesError) {
      throw companiesError;
    }

    // Get all unique owner IDs
    const ownerIds = [...new Set(companies?.map(c => c.owner_user_id) || [])];

    // Fetch user emails from auth.users
    const ownerEmails: Record<string, string> = {};
    const emailConfirmed: Record<string, boolean> = {};
    
    for (const ownerId of ownerIds) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerId);
      if (userData?.user?.email) {
        ownerEmails[ownerId] = userData.user.email;
        emailConfirmed[ownerId] = !!userData.user.email_confirmed_at;
      }
    }

    return new Response(
      JSON.stringify({ ownerEmails, emailConfirmed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
