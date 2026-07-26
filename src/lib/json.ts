/**
 * Best-effort JSON extraction from an LLM response. Even with a "return only
 * JSON" instruction, models occasionally wrap output in prose or code fences —
 * this pulls out the first balanced JSON object/array and parses it.
 */
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();

  // Strip a ```json ... ``` fence if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fall back to the first {...} or [...] span.
    const start = candidate.search(/[{[]/);
    const lastObj = candidate.lastIndexOf("}");
    const lastArr = candidate.lastIndexOf("]");
    const end = Math.max(lastObj, lastArr);
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1)) as T;
    }
    throw new Error(`Could not parse JSON from model output:\n${text.slice(0, 500)}`);
  }
}
