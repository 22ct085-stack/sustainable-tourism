import axios from 'axios';
import { env } from '../config/env';

interface ExplainedRecommendation { place: { id: string }; explanation: string[] }

/** AI may select only verbatim, deterministic evidence; it cannot introduce new claims. */
export async function selectExplanations<T extends ExplainedRecommendation>(recommendations: T[]): Promise<T[]> {
  if (!env.geminiApiKey || recommendations.length === 0) return recommendations;
  try {
    const source = recommendations.map(({ place, explanation }) => ({ placeId: place.id, allowedReasons: explanation }));
    const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`, {
      contents: [{ role: 'user', parts: [{ text: `Select the two most relevant reasons for each place from the supplied allowedReasons. Copy each selected reason exactly as written. Do not create, rewrite, or infer any fact. Return JSON only in this shape: {"items":[{"placeId":"...","explanation":["exact reason", "exact reason"]}]}. Input: ${JSON.stringify(source)}` }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }, { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey }, timeout: 5000 });
    const raw = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? '').join('');
    if (!raw) return recommendations;
    const parsed = JSON.parse(raw) as { items?: { placeId?: string; explanation?: string[] }[] };
    if (!Array.isArray(parsed.items) || parsed.items.length !== recommendations.length) return recommendations;
    const chosen = new Map(parsed.items.map((item) => [item.placeId, item.explanation]));
    return recommendations.map((recommendation) => {
      const reasons = chosen.get(recommendation.place.id);
      if (!Array.isArray(reasons) || reasons.length === 0 || reasons.some((reason) => !recommendation.explanation.includes(reason))) return recommendation;
      return { ...recommendation, explanation: reasons };
    });
  } catch {
    return recommendations;
  }
}
