// Author AI Persona - يحاكي أسلوب المؤلف مع إفصاح واضح
// ملاحظة: الإفصاح إلزامي في كل رد - يُعرض دائماً للمستخدم.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ChatMessage { role: "user" | "assistant"; content: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { authorName, messages, language = "ar" } = await req.json() as {
      authorName: string;
      messages: ChatMessage[];
      language?: string;
    };

    if (!authorName || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "authorName and messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // اجلب كتب هذا المؤلف لإثراء السياق
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: books } = await supabase
      .from("book_submissions")
      .select("title, category, description")
      .eq("status", "approved")
      .ilike("author", `%${authorName}%`)
      .limit(15);

    const bookContext = (books ?? [])
      .map((b, i) => `${i + 1}. "${b.title}"${b.category ? ` [${b.category}]` : ""}${b.description ? `\n   ${b.description.slice(0, 300)}` : ""}`)
      .join("\n");

    const systemPrompt = `أنت محاكاة ذكاء اصطناعي لأسلوب المؤلف "${authorName}". أنت لست المؤلف الحقيقي.

قواعد إلزامية:
1) ابدأ كل رد بسطر تنبيه واضح: "🤖 تنبيه: أنا محاكاة ذكاء اصطناعي وليس المؤلف الحقيقي."
2) ثم أجب بنفس اللغة (${language === "ar" ? "العربية" : language}) محاكياً نبرة المؤلف وأسلوبه ومفرداته قدر الإمكان.
3) لا تنسب لنفسك آراء سياسية أو دينية أو شخصية لم يُعرف بها المؤلف.
4) إذا سُئلت عن رأيك أو شعورك الشخصي، ذكّر السائل أنك محاكاة.
5) اعتمد على الكتب التالية المنسوبة للمؤلف كمصدر للسياق:
${bookContext || "(لا توجد كتب مفهرسة في الموقع)"}

اجعل ردك مفيداً، أدبياً، مختصراً (3-6 فقرات قصيرة).`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: apiMessages,
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("Author persona AI error:", res.status, body);
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
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await res.json();
    let reply: string = json.choices?.[0]?.message?.content ?? "";

    // ضمان وجود الإفصاح
    if (!reply.includes("محاكاة")) {
      reply = `🤖 تنبيه: أنا محاكاة ذكاء اصطناعي وليس المؤلف الحقيقي.\n\n${reply}`;
    }

    return new Response(JSON.stringify({
      reply,
      authorName,
      disclosure: "هذه محاكاة ذكاء اصطناعي وليست المؤلف الحقيقي. لا تعكس بالضرورة آراءه.",
      booksUsed: (books ?? []).length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("author-persona-chat error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
