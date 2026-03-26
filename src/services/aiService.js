import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

let provider = null; // "openai" | "gemini"
let openaiClient = null;
let geminiClient = null;

export function initProvider(selectedProvider, apiKey) {
  provider = selectedProvider;
  if (selectedProvider === "openai") {
    openaiClient = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  } else if (selectedProvider === "gemini") {
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
}

export function getProvider() {
  return provider;
}

const SYSTEM_PROMPT = `You are a financial planning assistant. 
Your job is to parse natural language budget instructions into structured JSON.

Always respond with ONLY valid JSON in this exact format:
{
  "action": "<increase|decrease|set|copy>",
  "value": <number or null>,
  "type": "<percentage|absolute|ly_actual|plan_copy|null>",
  "period": "<Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Q1|Q2|Q3|Q4|full_year|null>",
  "summary": "<short human-readable summary of what will happen>"
}

Rules:
- action: "increase" for growth, "decrease" for reduction, "set" for absolute assignment, "copy" for copying from another source
- value: numeric value (percent or dollar amount), null if not applicable
- type: "percentage" for %, "absolute" for $ amount, "ly_actual" when copying last year actuals, "plan_copy" when copying from another plan
- period: the time period affected — a specific month, Q1/Q2/Q3/Q4, or "full_year"
- summary: a concise confirmation message like "Transient Revenue increased by 10% for Apr–Jun"

Examples:
- "Increase by 10%" → {"action":"increase","value":10,"type":"percentage","period":"full_year","summary":"..."}
- "Reduce by $2000 in Q3" → {"action":"decrease","value":2000,"type":"absolute","period":"Q3","summary":"..."}
- "Set equal to last year actuals" → {"action":"copy","value":null,"type":"ly_actual","period":"full_year","summary":"..."}
- "Apply 5% growth from Jan to Mar" → {"action":"increase","value":5,"type":"percentage","period":"Q1","summary":"..."}
- "Increase Q2 by 12%" → {"action":"increase","value":12,"type":"percentage","period":"Q2","summary":"..."}`;

async function parseWithOpenAI(rowLabel, instruction) {
  if (!openaiClient) throw new Error("OpenAI client not initialized.");

  const userPrompt = `Row: "${rowLabel}"\nInstruction: "${instruction}"\n\nParse this into the JSON format.`;

  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}

async function parseWithGemini(rowLabel, instruction) {
  if (!geminiClient) throw new Error("Gemini client not initialized.");

  const model = geminiClient.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0,
    },
  });

  const fullPrompt = `${SYSTEM_PROMPT}\n\nRow: "${rowLabel}"\nInstruction: "${instruction}"\n\nParse this into the JSON format.`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  return JSON.parse(text);
}

export async function parseInstruction(rowLabel, instruction) {
  if (!provider) {
    throw new Error("No AI provider configured. Please connect an AI provider.");
  }
  if (provider === "openai") return parseWithOpenAI(rowLabel, instruction);
  if (provider === "gemini") return parseWithGemini(rowLabel, instruction);
  throw new Error("Unknown provider.");
}
