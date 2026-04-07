import { getConfig } from "@/lib/config";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_MODEL = "voyage-3";
const BATCH_SIZE = 128;

async function getApiKey(): Promise<string> {
  const key = await getConfig("VOYAGE_API_KEY");
  if (!key) throw new Error("VOYAGE_API_KEY is not set");
  return key;
}

interface VoyageResponse {
  data: { embedding: number[] }[];
  usage: { total_tokens: number };
}

async function callVoyageApi(texts: string[]): Promise<number[][]> {
  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getApiKey()}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage AI API error ${res.status}: ${body}`);
  }

  const json: VoyageResponse = await res.json();
  return json.data.map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await callVoyageApi([text]);
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const embeddings = await callVoyageApi(batch);
    results.push(...embeddings);
  }

  return results;
}
