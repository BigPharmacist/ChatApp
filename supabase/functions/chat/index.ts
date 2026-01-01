import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const NEBIUS_API_URL = "https://api.tokenfactory.nebius.com/v1/chat/completions"
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface Message {
  role: "user" | "assistant" | "system" | "tool"
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

interface ChatRequest {
  messages: Message[]
  model?: string
  stream?: boolean
  enableTools?: boolean
  systemPrompt?: string
}

// Modelle und ihre Tool-Choice Unterstützung
// "auto" = unterstützt tool_choice: "auto"
// "required" = braucht tool_choice: "required" oder explizite Funktion
// "none" = kein tool_choice Parameter senden (Modell entscheidet selbst)
const MODEL_TOOL_SUPPORT: Record<string, "auto" | "required" | "none"> = {
  "meta-llama/Llama-3.3-70B-Instruct-fast": "auto",
  "meta-llama/Llama-3.3-70B-Instruct": "auto",
  "Qwen/Qwen3-32B-fast": "auto",
  "Qwen/Qwen3-235B-A22B-Instruct-2507": "auto",
  "deepseek-ai/DeepSeek-V3-0324-fast": "auto",
  "deepseek-ai/DeepSeek-R1-0528-fast": "none",
  "google/gemma-3-27b-it-fast": "none",  // unterstützt kein "auto"
  "moonshotai/Kimi-K2-Instruct": "none",
  "moonshotai/Kimi-K2-Thinking": "none",
  "zai-org/GLM-4.5": "none",
}

// Tool-Definitionen
const tools = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Sucht im Internet nach aktuellen Informationen. Nutze dies für aktuelle Nachrichten, Fakten, oder wenn der Nutzer explizit nach einer Websuche fragt.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Die Suchanfrage auf Deutsch oder Englisch"
          }
        },
        required: ["query"]
      }
    }
  }
]

// Brave Search API aufrufen
async function braveSearch(query: string): Promise<string> {
  const braveApiKey = Deno.env.get("BRAVE_API_KEY")

  if (!braveApiKey) {
    return "Fehler: BRAVE_API_KEY nicht konfiguriert"
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: "5",
      search_lang: "de",
      ui_lang: "de-DE"
    })

    const response = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
      headers: {
        "Accept": "application/json",
        "X-Subscription-Token": braveApiKey
      }
    })

    if (!response.ok) {
      return `Suchfehler: ${response.status} ${response.statusText}`
    }

    const data = await response.json()

    // Ergebnisse formatieren
    const results = data.web?.results || []
    if (results.length === 0) {
      return "Keine Suchergebnisse gefunden."
    }

    return results.slice(0, 5).map((r: { title: string; url: string; description: string }, i: number) =>
      `${i + 1}. ${r.title}\n   ${r.url}\n   ${r.description}`
    ).join("\n\n")
  } catch (error) {
    return `Suchfehler: ${error.message}`
  }
}

// Tool-Aufrufe ausführen
async function executeToolCall(toolCall: ToolCall): Promise<string> {
  const { name, arguments: argsString } = toolCall.function

  try {
    const args = JSON.parse(argsString)

    switch (name) {
      case "web_search":
        return await braveSearch(args.query)
      default:
        return `Unbekanntes Tool: ${name}`
    }
  } catch (error) {
    return `Tool-Fehler: ${error.message}`
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("NEBIUS_API_KEY")
    console.log("API Key present:", !!apiKey)

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "NEBIUS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const { messages: initialMessages, model = "meta-llama/Llama-3.3-70B-Instruct-fast", stream = true, enableTools = true, systemPrompt }: ChatRequest = await req.json()

    // Prüfe ob das Modell Function Calling unterstützt
    const toolChoiceMode = MODEL_TOOL_SUPPORT[model] || "none"  // Default: versuche ohne tool_choice
    const useTools = enableTools && toolChoiceMode !== undefined

    console.log("Request - Model:", model, "Messages:", initialMessages.length, "Stream:", stream, "Tools enabled:", enableTools, "Tool choice mode:", toolChoiceMode, "useTools:", useTools)

    // Aktuelles Datum und Uhrzeit für System-Prompt
    const now = new Date()
    const dateFormatter = new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin'
    })
    const currentDateTime = dateFormatter.format(now)

    // Arbeite mit einer Kopie der Messages
    // Füge System-Prompt nur hinzu wenn Tools aktiviert sind und noch keiner vorhanden
    const hasSystemMessage = initialMessages.some(m => m.role === "system")
    console.log("Adding system prompt:", useTools && !hasSystemMessage, "DateTime:", currentDateTime)

    // System-Prompt: Verwende den übergebenen systemPrompt oder den Default
    const baseSystemPrompt = systemPrompt || "Du bist ein hilfreicher Assistent."

    // Baue den vollständigen System-Prompt mit Datum und Tool-Infos
    const fullSystemPrompt = useTools
      ? `${baseSystemPrompt}

Aktuelles Datum und Uhrzeit: ${currentDateTime}

Du hast Zugriff auf eine Web-Suche Funktion.

WICHTIG: Wenn der Nutzer nach aktuellen Informationen fragt (Nachrichten, Wetter, aktuelle Ereignisse, Preise, etc.) oder explizit eine Internetsuche wünscht, MUSST du die web_search Funktion verwenden.

Beispiele wann du web_search nutzen sollst:
- "Was sind die aktuellen Nachrichten?"
- "Suche im Internet nach..."
- "Was kostet... aktuell?"
- "Wie ist das Wetter in...?"
- Alle Fragen zu Ereignissen nach deinem Wissensstand`
      : `${baseSystemPrompt}

Aktuelles Datum und Uhrzeit: ${currentDateTime}`

    const messages: Message[] = !hasSystemMessage ? [
      {
        role: "system",
        content: fullSystemPrompt
      },
      ...initialMessages
    ] : [...initialMessages]

    // Tool-Loop: Maximal 10 Tool-Aufrufe, danach Antwort erzwingen
    const MAX_TOOL_ITERATIONS = 10
    let toolIterations = 0
    const usedTools: string[] = []  // Track welche Tools verwendet wurden

    while (toolIterations <= MAX_TOOL_ITERATIONS) {
      const requestBody: Record<string, unknown> = {
        model,
        messages,
        stream: false, // Für Tool-Detection kein Streaming
        max_tokens: 2048,
        temperature: 0.7,
      }

      // Tools nur hinzufügen wenn aktiviert UND noch nicht max erreicht
      const enableToolsThisRound = useTools && toolIterations < MAX_TOOL_ITERATIONS
      if (enableToolsThisRound) {
        requestBody.tools = tools
        // tool_choice nur setzen wenn das Modell "auto" unterstützt
        if (toolChoiceMode === "auto") {
          requestBody.tool_choice = "auto"
        } else if (toolChoiceMode === "required") {
          requestBody.tool_choice = "required"
        }
        // bei "none" wird kein tool_choice gesendet - Modell entscheidet selbst
      }

      console.log(`Sending to Nebius (iteration ${toolIterations}):`, NEBIUS_API_URL)

      const response = await fetch(NEBIUS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

      console.log("Nebius response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Nebius API error:", response.status, errorText)
        return new Response(
          JSON.stringify({
            error: `Nebius API Fehler (${response.status}): ${errorText}`,
            status: response.status,
            details: errorText
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const data = await response.json()
      const assistantMessage = data.choices?.[0]?.message

      console.log("Assistant message:", JSON.stringify(assistantMessage, null, 2))

      if (!assistantMessage) {
        return new Response(
          JSON.stringify({ error: "Keine Antwort vom Modell erhalten" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Prüfe auf Tool-Aufrufe
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log("Tool calls detected:", assistantMessage.tool_calls.length)

        // Assistant-Message mit Tool-Calls hinzufügen
        messages.push({
          role: "assistant",
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls
        })

        // Alle Tools ausführen
        for (const toolCall of assistantMessage.tool_calls) {
          console.log(`Executing tool: ${toolCall.function.name}`)
          usedTools.push(toolCall.function.name)
          const result = await executeToolCall(toolCall)
          console.log(`Tool result length: ${result.length}`)

          // Tool-Ergebnis hinzufügen
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result
          })
        }

        toolIterations++
        continue // Nächste Iteration für finale Antwort
      }

      // Keine Tool-Aufrufe mehr - finale Antwort
      if (stream && toolIterations === 0 && !assistantMessage.tool_calls) {
        // Wenn Streaming gewünscht und keine Tools aufgerufen wurden,
        // machen wir einen neuen Request mit Streaming (ohne Tools für bessere Performance)
        const streamRequestBody = {
          model,
          messages: initialMessages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.7,
        }

        const streamResponse = await fetch(NEBIUS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(streamRequestBody),
        })

        return new Response(streamResponse.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      }

      // Nicht-Streaming oder nach Tool-Verwendung
      // Füge Tool-Info zur Antwort hinzu wenn Tools verwendet wurden
      if (usedTools.length > 0 && data.choices?.[0]?.message?.content) {
        const toolInfo = usedTools.includes("web_search")
          ? "🔍 *Websuche durchgeführt*\n\n"
          : ""
        data.choices[0].message.content = toolInfo + data.choices[0].message.content
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Max iterations erreicht
    return new Response(
      JSON.stringify({ error: "Maximale Tool-Iterationen erreicht" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
