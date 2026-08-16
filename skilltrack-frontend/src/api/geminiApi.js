/**
 * SkillTrack Gemini API Client
 *
 * ⚠️  NOTE: The current AQ. key only supports model listing, not generation.
 *    To enable real AI: get a key from https://aistudio.google.com/apikey
 *    and replace GEMINI_API_KEY below.
 *
 * Until then, this module returns high-quality static fallback responses
 * so the app remains fully functional.
 */

const GEMINI_API_KEY = "AQ.Ab8RN6Jj1_O9O_Ht61WQTXjJYUkpNva77DBxxmw8vXoNKMK7Yw";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL = "gemini-3.6-flash";
const TIMEOUT_MS = 12000;

/**
 * Core function — calls Gemini Interactions API with a timeout.
 * Falls back to static responses on failure.
 */
async function callGemini(system, history = [], userMsg, fallbackFn) {
  const body = {
    model: MODEL,
    system_instruction: system || undefined,
    input: userMsg,
  };

  const url = `${INTERACTIONS_URL}?key=${GEMINI_API_KEY}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      let errBody = {};
      try { errBody = await res.json(); } catch (_) {}
      console.warn("[GeminiAPI] API error, using fallback. Status:", res.status, errBody?.error?.message);
      return fallbackFn ? fallbackFn() : getGenericFallback();
    }

    const data = await res.json();

    // Extract from Interactions API format: steps[].content[].text
    const steps = data?.steps || [];
    for (const step of steps) {
      if (step.type === "model_output" && Array.isArray(step.content)) {
        for (const block of step.content) {
          if (block.type === "text" && block.text) return block.text;
        }
      }
    }

    // Fallback: convenience property
    if (data?.output_text) return data.output_text;

    // Fallback: legacy generateContent format
    const legacy = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (legacy) return legacy;

    console.warn("[GeminiAPI] Empty response, using fallback");
    return fallbackFn ? fallbackFn() : getGenericFallback();

  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn("[GeminiAPI] Request timed out, using fallback");
    } else {
      console.warn("[GeminiAPI] Network error, using fallback:", err.message);
    }
    return fallbackFn ? fallbackFn() : getGenericFallback();
  }
}

function getGenericFallback() {
  return `**AI Analysis Unavailable**

The AI assistant is temporarily unavailable. This may be due to API key configuration.

**To enable AI features:**
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key (it will start with \`AIza...\`)
3. Replace the key in \`src/api/geminiApi.js\`

Your simulation progress and scores have been saved normally.`;
}

// ─────────────────────────────────────────────
// 1. Simulation Help Chat
// ─────────────────────────────────────────────
export async function askSimulationHelp({ missionTitle, objectiveDescription, history, userMessage }) {
  const system = `You are SimOS Assistant, an expert AI training coach for the SkillTrack professional simulation platform.
You are currently helping a learner with the simulation: "${missionTitle}".
The learner is trying to complete this objective: "${objectiveDescription}".
Give precise, step-by-step technical guidance. Explain WHY each step matters.
Be concise but thorough (2-4 sentences per point). Use code/command formatting when relevant.
Encourage the learner warmly but professionally.`;

  const fallback = () => `**SimOS Assistant** 🤖

I'm currently running in offline mode, but here's guidance for **${missionTitle}**:

**Objective:** ${objectiveDescription}

**General approach:**
- Break the task into smaller sub-steps
- Verify each step before proceeding
- Check logs/output for errors at each stage
- Reference the simulation hints if you get stuck

💡 *For real-time AI guidance, update the API key in \`geminiApi.js\`*`;

  return callGemini(system, history, userMessage, fallback);
}

// ─────────────────────────────────────────────
// 2. Detailed Attempt Feedback
// ─────────────────────────────────────────────
export async function generateDetailedFeedback({ simulationTitle, simulationCategory, score, passed, mistakes, competencies, hintsUsed, timeTaken }) {
  const mistakesList = mistakes.length > 0
    ? mistakes.map((m, i) => `${i + 1}. [${m.severity?.toUpperCase() || "INFO"}] ${m.description} — Consequence: ${m.consequence} (penalty: ${m.penalty} pts)`).join("\n")
    : "No mistakes were detected.";

  const compList = Object.entries(competencies || {})
    .map(([k, v]) => `• ${k}: ${Math.round(v)}%`)
    .join("\n");

  const system = `You are an expert AI performance coach on the SkillTrack professional training platform.
You deliver personalised, actionable post-simulation feedback reports.`;

  const userMsg = `Analyse this learner's simulation attempt and write a detailed feedback report:

SIMULATION: "${simulationTitle}" (${simulationCategory})
OVERALL SCORE: ${score}/100 — ${passed ? "PASSED ✓" : "FAILED ✗"}
TIME TAKEN: ${timeTaken ? Math.floor(timeTaken / 60) + "m " + (timeTaken % 60) + "s" : "N/A"}
HINTS USED: ${hintsUsed}

MISTAKES MADE:
${mistakesList}

COMPETENCY SCORES:
${compList || "Not available."}

Write a report with these EXACT sections:
1. **Overall Assessment** — 2-3 sentences summarising performance
2. **What You Did Well** — bullet points of strengths
3. **Key Mistakes & How to Fix Them** — explain WHY each happened and HOW to avoid it
4. **Competency Gaps** — which competencies need work and specific improvement actions
5. **Action Plan** — 3 concrete steps before the next attempt
6. **Encouragement** — 1 motivational closing sentence

Be specific, practical and honest.`;

  const fallback = () => {
    const grade = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Satisfactory" : "Needs Improvement";
    const topComp = Object.entries(competencies || {}).sort((a, b) => b[1] - a[1])[0];
    const lowComp = Object.entries(competencies || {}).sort((a, b) => a[1] - b[1])[0];

    const gapMessage = lowComp && lowComp[1] < 100 ? `Focus on improving **${lowComp[0]}** (${Math.round(lowComp[1])}%).` : "All competencies are perfect — keep challenging yourself!";

    return `## Performance Report — ${simulationTitle}

**1. Overall Assessment**
You scored **${score}/100** (${grade}) on the ${simulationCategory} simulation. ${passed ? "Congratulations on passing! 🎉" : "Keep practicing — you're making progress."} ${hintsUsed > 2 ? "Consider reviewing the core concepts to reduce hint dependency." : "Good independence in approaching the tasks."}

**2. What You Did Well**
${topComp ? `• Strong performance in **${topComp[0]}** (${Math.round(topComp[1])}%)` : "• Attempted all required objectives"}
• ${hintsUsed === 0 ? "Completed without any hints — excellent self-sufficiency!" : `Used hints strategically (${hintsUsed} used)`}
• Engaged with the simulation to completion

**3. Key Mistakes & How to Fix Them**
${mistakes.length === 0 ? "No critical mistakes detected — well done!" : "Review the listed mistakes and apply the suggested fixes."}

**4. Competency Gaps**
${gapMessage}

**5. Action Plan**
1. Review the learning materials for concepts where ${lowComp && lowComp[1] < 100 ? `your ${lowComp[0]} competency is lower` : "all competencies are strong"}.
2. Retry the simulation focusing on the identified gap.
3. Challenge yourself with the next difficulty level.

**6. Encouragement**
Outstanding effort — keep building on this success! 🚀

---
*⚠️ AI-generated analysis unavailable. Configure a valid Gemini API key for personalised feedback.*`;
  };

  return callGemini(system, [], userMsg, fallback);
}

// ─────────────────────────────────────────────
// 3. General SkillTrack Chat Assistant
// ─────────────────────────────────────────────
export async function askSkillTrackAssistant({ history, userMessage, userName, userRole }) {
  const system = `You are SkillTrack AI, an intelligent learning assistant on the SkillTrack professional simulation training platform.
The user's name is ${userName || "Learner"} and their role is ${userRole || "learner"}.
Help with: simulation concepts, improving scores, training procedures, recommending learning paths, and motivating learners.
Be warm, professional, concise, and practical.`;

  const fallback = () => `**SkillTrack AI** (Offline Mode)

Hi ${userName || "there"}! 👋 I'm currently running in offline mode.

For your question: *"${userMessage}"*

I'd suggest:
- Checking the simulation hints and objectives panel
- Reviewing your past attempt feedback for patterns
- Exploring the learning resources in your dashboard

**To enable full AI chat**, update the API key in \`geminiApi.js\` with a key from [Google AI Studio](https://aistudio.google.com/apikey).`;

  return callGemini(system, history, userMessage, fallback);
}

export const geminiApi = {
  askSimulationHelp,
  generateDetailedFeedback,
  askSkillTrackAssistant,
};
