// Edge Function: sheets-proxy
// Proxy GET/POST para o Google Apps Script (Web App da planilha de OS).
// Resolve CORS e contorna o redirecionamento de login do Google.

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzz1dTU7HVTScVtb37rxAqSR7X0OQmUiZcfvePwGkWM2LaKx1JRSwcEDKnRPMJBPxS7mw/exec?sheet=BD";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const stripHtml = (text: string) =>
  text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const appsScriptError = (text: string, fallback: string) => {
  const message = stripHtml(text) || fallback;
  const mentionedHandler = message.match(/\b(doGet|doPost)\b/i)?.[1];
  const missingHandler = /function|funktion|not found|nicht gefunden/i.test(message)
    ? mentionedHandler
    : undefined;

  return {
    ok: false,
    rows: [],
    error: missingHandler
      ? `Apps Script sem a função ${missingHandler}. Adicione ${missingHandler}(e) e publique uma nova versão do Web App.`
      : message.includes("Authorization") || message.includes("Sign in")
        ? "Apps Script exige login. Publique o Web App com acesso 'Qualquer pessoa'."
        : message,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "GET") {
      const upstream = await fetch(APPS_SCRIPT_URL, {
        method: "GET",
        redirect: "follow",
      });
      const text = await upstream.text();

      if (!upstream.ok) {
        console.error("Apps Script GET failed", upstream.status, text.slice(0, 300));
        return json(200, appsScriptError(text, `Falha ao consultar planilha (${upstream.status}).`));
      }

      // Tenta parsear como JSON; se vier HTML/erro do Apps Script,
      // responde 200 com erro controlado para não disparar overlay/tela preta no app.
      try {
        const data = JSON.parse(text);
        return json(200, data);
      } catch {
        console.error("Resposta não-JSON do Apps Script:", text.slice(0, 300));
        return json(200, appsScriptError(text, "O Apps Script não retornou JSON."));
      }
    }

    if (req.method === "POST") {
      const body = await req.text();

      // text/plain evita preflight CORS no Apps Script;
      // o script lê o JSON em e.postData.contents
      const upstream = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body,
        redirect: "follow",
      });
      const text = await upstream.text();

      if (!upstream.ok) {
        console.error("Apps Script POST failed", upstream.status, text.slice(0, 300));
        return json(200, appsScriptError(text, `Falha ao gravar na planilha (${upstream.status}).`));
      }

      try {
        const data = JSON.parse(text);
        return json(200, data);
      } catch {
        const clean = stripHtml(text);
        if (/Script function not found:\s*doPost/i.test(clean) || /<html/i.test(text)) {
          return json(200, appsScriptError(text, "O Apps Script não retornou JSON."));
        }

        // Apps Script às vezes responde texto simples — tratamos como sucesso.
        return json(200, { ok: true, raw: clean || text });
      }
    }

    return json(405, { error: "Método não permitido" });
  } catch (err) {
    console.error("sheets-proxy error:", err);
    return json(200, {
      ok: false,
      rows: [],
      error: err instanceof Error ? err.message : "Erro desconhecido",
    });
  }
});
