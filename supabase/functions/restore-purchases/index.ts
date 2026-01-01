import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query purchases for this email
    const { data: purchases, error } = await supabaseClient
      .from("purchases")
      .select("item_id, item_type, item_name, created_at")
      .eq("email", email.toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching purchases:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch purchases" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Deduplicate by item_id (in case of multiple purchases of same item)
    const uniquePurchases = purchases?.reduce((acc, purchase) => {
      if (!acc.find(p => p.item_id === purchase.item_id)) {
        acc.push(purchase);
      }
      return acc;
    }, [] as typeof purchases) || [];

    return new Response(
      JSON.stringify({ 
        success: true, 
        purchases: uniquePurchases,
        count: uniquePurchases.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error in restore-purchases:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
