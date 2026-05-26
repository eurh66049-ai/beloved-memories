// Translate text - ترجمة فورية للنص المحدد إلى أي لغة
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MAX_LEN = 4000;

const LANG_NAMES: Record<string, string> = {
  ar: "العربية", en: "English", fr: "Français", es: "Español",
  de: "Deutsch", tr: "Türkçe", it: "Italiano", pt: "Português",
  ru: "Русский", zh: "中文", ja: "日本語", ko: "한국어",
  hi: "हिन्दी", ur: "اردو", fa: "فارسی", id: "Bahasa Indonesia",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, targetLang = "en", sourceLang } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clipped = text.trim().slice(0, MAX_LEN);
    const targetName = LANG_NAMES[targetLang] || targetLang;
    const fromHint = sourceLang && LANG_NAMES[sourceLang] ? ` من ${LANG_NAMES[sourceLang]}` : "";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `أنت مترجم محترف. ترجم النص${fromHint} إلى ${targetName} مع الحفاظ على المعنى والأسلوب الأدبي. أرجع الترجمة فقط بدون أي شرح أو تعليق أو مقدمة.`,
          },
          { role: "user", content: clipped },
        ],
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Translate AI error:", res.status, body);
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز الحد المسموح، حاول لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "نفد الرصيد المخصص للذكاء الاصطناعي" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Translation error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    const translation = (json.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({
      translation,
      targetLang,
      targetLangName: targetName,
      truncated: text.length > MAX_LEN,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate-text error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
