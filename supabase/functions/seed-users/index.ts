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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results: string[] = [];

    // Create Chris account
    const { data: chrisData, error: chrisError } = await supabase.auth.admin.createUser({
      email: "chris@lekolfasil.app",
      password: "lekol2025",
      email_confirm: true,
      user_metadata: {
        display_name: "Chris",
        role: "student",
        student_id: "CHRIS",
      },
    });
    if (chrisError) {
      results.push(`Chris: ${chrisError.message}`);
    } else {
      results.push(`Chris created: ${chrisData.user.id}`);
    }

    // Create Dad account
    const { data: dadData, error: dadError } = await supabase.auth.admin.createUser({
      email: "dad@lekolfasil.app",
      password: "lekol2025",
      email_confirm: true,
      user_metadata: {
        display_name: "Dad",
        role: "parent",
        student_id: "CHRIS",
      },
    });
    if (dadError) {
      results.push(`Dad: ${dadError.message}`);
    } else {
      results.push(`Dad created: ${dadData.user.id}`);
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
