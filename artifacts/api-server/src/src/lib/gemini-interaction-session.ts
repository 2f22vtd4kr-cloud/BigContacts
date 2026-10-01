import { fetchGeminiInteractions } from "./gemini-interactions-transport";
import { selectGeminiThinkingLevel } from "./gemini-thinking-policy";

export type GeminiInteractionSessionOptions = {
  apiKey: string;
  model: string;
  system?: string;
  responseFormat?: Record<string, unknown>;
  signal?: AbortSignal;
};

export type GeminiInteractionTurn = {
  interactionId: string | null;
  outputText: string;
  raw: Record<string, unknown>;
};

export class GeminiInteractionSession {
  private previousInteractionId: string | null = null;
  constructor(private readonly options: GeminiInteractionSessionOptions) {}

  get interactionId(): string | null { return this.previousInteractionId; }

  async ask(input: string, risk: Parameters<typeof selectGeminiThinkingLevel>[1] = {}): Promise<GeminiInteractionTurn> {
    if (this.options.signal?.aborted) throw new Error("cancelled");
    const body: Record<string, unknown> = {
      model: this.options.model,
      input: input.slice(0, 12000),
      generation_config: {
        max_output_tokens: 1400,
        thinking_level: selectGeminiThinkingLevel(this.options.model, risk),
      },
    };
    if (this.options.system) body.system_instruction = this.options.system.slice(0, 6000);
    if (this.options.responseFormat) body.response_format = this.options.responseFormat;
    if (this.previousInteractionId) body.previous_interaction_id = this.previousInteractionId;
    const response = await fetchGeminiInteractions("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "x-goog-api-key": this.options.apiKey },
      body: JSON.stringify(body),
      signal: this.options.signal,
    });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error("Gemini interaction session HTTP " + response.status);
    const interaction = payload.interaction && typeof payload.interaction === "object" ? payload.interaction as Record<string, unknown> : payload;
    const id = typeof interaction.id === "string" ? interaction.id : null;
    const outputText = typeof interaction.output_text === "string" ? interaction.output_text.trim() : "";
    if (!id) throw new Error("Gemini interaction session returned no interaction id.");
    this.previousInteractionId = id;
    return { interactionId: id, outputText, raw: interaction };
  }
}
