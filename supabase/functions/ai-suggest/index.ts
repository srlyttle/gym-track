// Supabase Edge Function: ai-suggest
// Deploy with: supabase functions deploy ai-suggest
// Set secret: supabase secrets set CLAUDE_API_KEY=sk-ant-...
//
// Required Supabase tables: see supabase/migrations/001_ai_paywall.sql

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";

const FREE_MONTHLY_LIMIT = 10;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!claudeApiKey) {
      return jsonResponse(
        { error: "AI service not configured" },
        500
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { deviceId, prompt, maxTokens = 2048 } = body;

    if (!deviceId || !prompt) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    // Current month key e.g. "2024-01"
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Check subscription
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan, status, expires_at")
      .eq("device_id", deviceId)
      .maybeSingle();

    const isPro =
      subscription?.plan === "pro" &&
      subscription?.status === "active" &&
      (!subscription.expires_at ||
        new Date(subscription.expires_at) > now);

    const monthlyLimit = isPro ? 999999 : FREE_MONTHLY_LIMIT;
    const plan = isPro ? "pro" : "free";

    // Get usage for this month
    const { data: usage } = await supabase
      .from("ai_usage")
      .select("count")
      .eq("device_id", deviceId)
      .eq("month", month)
      .maybeSingle();

    const currentCount = usage?.count ?? 0;

    if (currentCount >= monthlyLimit) {
      return jsonResponse(
        {
          error: "quota_exceeded",
          quota: { used: currentCount, limit: monthlyLimit, plan },
        },
        402
      );
    }

    // Call Claude API
    const claudeResponse = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: maxTokens,
        system:
          "You are an expert fitness coach and personal trainer. Return ONLY valid JSON with no additional text, markdown, or explanation.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const errorBody = await claudeResponse.text();
      console.error("Claude API error:", claudeResponse.status, errorBody);
      return jsonResponse(
        { error: "AI service temporarily unavailable. Please try again." },
        502
      );
    }

    const claudeData = await claudeResponse.json();
    const content = claudeData.content?.[0]?.text;

    if (!content) {
      return jsonResponse(
        { error: "Empty response from AI. Please try again." },
        502
      );
    }

    // Increment usage (upsert)
    await supabase.rpc("increment_ai_usage", {
      p_device_id: deviceId,
      p_month: month,
    });

    const newCount = currentCount + 1;

    return jsonResponse({
      content,
      quota: { used: newCount, limit: monthlyLimit, plan },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
