const path = require('path');
// Load environment variables:
// - Prefer `.env` (common convention)
// - Fallback to `env` (some Windows setups omit dotfiles)
const dotenv = require('dotenv');
const envPathDot = path.resolve(__dirname, '../.env');
const envPathNoDot = path.resolve(__dirname, '../env');
const dotResult = dotenv.config({ path: envPathDot });
if (dotResult.error) {
  const noDotResult = dotenv.config({ path: envPathNoDot });
  if (noDotResult.error) {
    // Keep running; platform env vars (Railway/Render) may still be present.
    console.warn(`⚠️  dotenv could not load ${envPathDot} or ${envPathNoDot}:`, noDotResult.error.message);
  }
}

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
/* ============================================================
   1. API KEY KONTROLÜ
============================================================ */



if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY environment variable bulunamadı!");
  console.error(`📁 Kontrol edilen dosyalar: ${envPathDot}, ${envPathNoDot}`);
  throw new Error("❌ GEMINI_API_KEY environment variable bulunamadı! Lütfen backend/.env dosyanızda GEMINI_API_KEY değişkenini tanımlayın.");
}

// Log API key loaded status (without showing the actual key)
console.log(`✅ GEMINI_API_KEY yüklendi (uzunluk: ${GEMINI_API_KEY.length} karakter)`);

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/* ============================================================
   2. GENERATION CONFIG
============================================================ */

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192
};

/* ============================================================
   3. API KEY TEST (SADE & GÜVENİLİR)
============================================================ */

async function testApiKey() {
  const modelsToTry = [
    { id: "gemini-2.5-flash", names: ["models/gemini-2.5-flash", "gemini-2.5-flash"] }
  ];

  let lastError = null;

  for (const candidate of modelsToTry) {
    for (const modelName of candidate.names) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        const text = result?.response?.text?.();

        return {
          valid: Boolean(text),
          availableModels: [candidate.id]
        };
      } catch (error) {
        lastError = error;

        const msg = String(error?.message || "");
        const isModelNotFound = msg.includes("404") || msg.toLowerCase().includes("not found");

        // If the error isn't about model availability, don't continue trying fallbacks
        if (!isModelNotFound) {
          return {
            valid: false,
            availableModels: [],
            error: msg
          };
        }

        // Otherwise, try next model format / next model id
      }
    }
  }

  return {
    valid: false,
    availableModels: [],
    error: lastError?.message || "Model not available"
  };
}


/* ============================================================
   4. RAPOR ÜRETİMİ (TEK VE STABİL MODEL)
============================================================ */

async function generateReport(analysisData) {
  const userPrompt = buildUserPrompt(analysisData);

  const systemInstruction = `
You are an expert AI Ethics Evaluator and Auditor specializing in the Z-Inspection methodology.
Your task is to analyze raw AI ethics assessment data and generate a comprehensive, professional,
and actionable evaluation report for stakeholders. This report will be converted to PDF format.

Requirements:
- Clear structure and headings (use # for main title, ## for sections, ### for subsections)
- Evidence-based analysis
- Identification of risks and strengths
- Actionable recommendations
- Professional Markdown formatting suitable for PDF conversion
- Clear and professional English
- Use proper Markdown syntax: **bold**, *italic*, lists (- or 1.), tables, code blocks
- Structure the report with clear sections that will render well in PDF format
- Include page-break considerations in your structure
`;

  const modelNamesToTry = [
    "models/gemini-2.5-flash",
    "gemini-2.5-flash"
  ];

  let lastError = null;

  for (const modelName of modelNamesToTry) {
    try {
      console.log(`🤖 Gemini (${modelName}) rapor üretiyor...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig
      });

      const report = result.response.text();

      if (!report) {
        throw new Error("❌ Gemini boş yanıt döndü.");
      }

      console.log(`✅ Rapor başarıyla oluşturuldu (${modelName}).`);
      return report;

    } catch (error) {
      console.error(`❌ Model ${modelName} başarısız:`, error.message);
      lastError = error;
      
      // If it's not a 404 (model not found), don't try other models
      if (!error.message.includes("404") && !error.message.includes("not found")) {
        break;
      }
    }
  }

  // If we get here, all models failed
  console.error("❌ Tüm Gemini modelleri başarısız oldu.");

  if (lastError) {
    const errorMsg = lastError.message || '';
    const errorMsgLower = errorMsg.toLowerCase();
    
    // Check for API key expired or invalid (400 Bad Request)
    if (errorMsg.includes("400") || errorMsgLower.includes("expired") || errorMsgLower.includes("api_key_invalid") || errorMsgLower.includes("api key expired")) {
      throw new Error("❌ Gemini API Key süresi dolmuş veya geçersiz. Lütfen .env dosyanızdaki GEMINI_API_KEY değerini kontrol edin ve yeni bir API key oluşturun.");
    }

    if (errorMsg.includes("403") || errorMsgLower.includes("permission_denied")) {
      throw new Error("❌ Gemini API Key geçersiz veya yetkisiz.");
    }

    if (errorMsg.includes("429") || errorMsgLower.includes("resource_exhausted") || errorMsgLower.includes("quota")) {
      throw new Error("❌ Gemini API quota aşıldı. Lütfen daha sonra tekrar deneyin.");
    }

    if (errorMsg.includes("404") || errorMsgLower.includes("not found")) {
      throw new Error("❌ Gemini modeli bulunamadı. Lütfen API key'inizi ve model erişiminizi kontrol edin.");
    }

    throw new Error(`❌ Rapor oluşturulamadı: ${lastError.message}`);
  }

  throw new Error("❌ Rapor oluşturulamadı: Bilinmeyen hata.");
}

/* ============================================================
   5. PROMPT BUILDER (Z-INSPECTION VERİ ODAKLI)
============================================================ */

function buildUserPrompt(data) {
  const project = data.project || {};
  const scores = data.scores || [];
  const generalAnswers = data.generalAnswers || [];
  const tensions = data.tensions || [];
  const evaluations = data.evaluations || [];

  let prompt = `# AI ETHICS EVALUATION DATA\n\n`;
  prompt += `Analyze the following data using the Z-Inspection methodology.\n\n`;

  /* PROJECT CONTEXT */
  prompt += `## PROJECT CONTEXT\n`;
  prompt += `**Title:** ${project.title || "Untitled Project"}\n`;
  prompt += `**Description:** ${project.fullDescription || project.shortDescription || "N/A"}\n`;
  prompt += `**Status:** ${project.status || "N/A"}\n`;
  prompt += `**Progress:** ${project.progress || 0}%\n\n`;

  /* SCORES */
  prompt += `## ETHICAL PRINCIPLE SCORES\n`;
  if (scores.length === 0) {
    prompt += `No score data available.\n\n`;
  } else {
    scores.forEach((s, i) => {
      prompt += `### Evaluator ${i + 1}${s.role ? ` (${s.role})` : ""}\n`;
      prompt += `Average Score: ${s.totals?.avg?.toFixed(2) || "N/A"} / 4.0\n`;

      if (s.byPrinciple) {
        Object.entries(s.byPrinciple).forEach(([p, v]) => {
          if (v?.avg !== undefined) {
            prompt += `- ${p}: ${v.avg.toFixed(2)} / 4.0\n`;
          }
        });
      }
      prompt += `\n`;
    });
  }

  /* GENERAL ANSWERS */
  if (generalAnswers.length > 0) {
    prompt += `## GENERAL ASSESSMENT ANSWERS\n`;
    generalAnswers.forEach((a, i) => {
      prompt += `${i + 1}. **${a.question}**\n${a.answer}\n\n`;
    });
  }

  /* TENSIONS */
  prompt += `## ETHICAL TENSIONS\n`;
  if (tensions.length === 0) {
    prompt += `No ethical tensions identified.\n\n`;
  } else {
    tensions.forEach((t, i) => {
      prompt += `### Tension ${i + 1}: ${t.principle1} vs ${t.principle2}\n`;
      prompt += `- Description: ${t.claimStatement}\n`;
      prompt += `- Severity: ${t.severity}\n`;
      prompt += `- Status: ${t.status}\n\n`;
    });
  }

  /* RISKS */
  prompt += `## RISKS & EVALUATIONS\n`;
  if (evaluations.length === 0) {
    prompt += `No detailed evaluation data available.\n\n`;
  } else {
    evaluations.forEach((e, i) => {
      prompt += `### Stage ${i + 1}: ${e.stage}\n`;
      if (e.generalRisks?.length) {
        e.generalRisks.forEach((r, j) => {
          prompt += `${j + 1}. ${r.title} (Severity: ${r.severity})\n${r.description}\n\n`;
        });
      } else {
        prompt += `No risks identified.\n\n`;
      }
    });
  }

  /* OUTPUT INSTRUCTIONS */
  prompt += `
---
# REPORT STRUCTURE
Generate a comprehensive PDF-ready report with the following structure:

1. **Executive Summary**
   - Brief overview of the project
   - Key findings and overall risk assessment
   - Main recommendations

2. **Risk Assessment Matrix**
   - Visual representation of risks by principle
   - Severity levels and impact analysis

3. **Principle-by-Principle Analysis**
   - Detailed analysis for each ethical principle
   - Scores, evaluations, and evidence
   - Strengths and weaknesses identified

4. **Tension Analysis**
   - Identified ethical tensions
   - Conflict resolution strategies
   - Consensus building approaches

5. **Actionable Recommendations**
   - Prioritized recommendations
   - Implementation steps
   - Timeline and resource requirements

6. **Conclusion**
   - Summary of key points
   - Next steps
   - Contact information

**IMPORTANT FORMATTING REQUIREMENTS:**
- Use proper Markdown syntax for PDF conversion
- Use # for main title, ## for major sections, ### for subsections
- Use **bold** for emphasis, *italic* for important notes
- Use numbered lists (1., 2., 3.) for sequential items
- Use bullet points (- or *) for non-sequential items
- Use tables for structured data when appropriate
- Ensure all content is professional and suitable for PDF export
- Format dates, numbers, and technical terms clearly
`;

  return prompt;
}

/* ============================================================
   5. EXPERT COMMENTS ANALYZER
============================================================ */

async function analyzeExpertComments(expertComments) {
  // Validate input
  if (!expertComments || (typeof expertComments !== 'string' && !Array.isArray(expertComments))) {
    throw new Error('expertComments must be a string or array of strings');
  }

  // Convert array to single string if needed
  const commentsText = Array.isArray(expertComments) 
    ? expertComments.join('\n\n---\n\n') 
    : expertComments;

  if (!commentsText.trim()) {
    throw new Error('expertComments cannot be empty');
  }

  const systemInstruction = `You are an AI assistant used STRICTLY as a semantic analysis and decision-support tool
within an ethical AI evaluation platform based on the Z-Inspection methodology.

IMPORTANT LIMITATIONS:
- You MUST NOT make final decisions.
- You MUST NOT approve, reject, or classify an AI system as compliant or non-compliant.
- You MUST NOT override or reinterpret expert intent.
- You MUST NOT invent risks, facts, or assumptions not explicitly stated.
- Your output is advisory only and non-binding.
- Human administrators retain full authority, responsibility, and accountability.
- Your role is limited to semantic interpretation of expert-written text.`;

  const userPrompt = `TASK:
You will receive one or more expert comments evaluating an AI system.

Your objectives are:
1. Summarize the main concerns, agreements, or recurring themes.
2. Identify which ethical principles are implicated by the expert language.
3. Estimate the overall risk tone expressed by the experts.
4. Detect whether explicit warning signals are present.
5. Estimate confidence based on clarity, strength, and consistency of expert statements.

--------------------------------------------------

ETHICAL PRINCIPLES (USE ONLY THESE LABELS - MATCH EXACTLY):
Match the expert comments to these Z-Inspection principles:
- TRANSPARENCY
- TRANSPARENCY & EXPLAINABILITY
- HUMAN AGENCY & OVERSIGHT
- HUMAN OVERSIGHT & CONTROL
- TECHNICAL ROBUSTNESS & SAFETY
- PRIVACY & DATA GOVERNANCE
- PRIVACY & DATA PROTECTION
- DIVERSITY, NON-DISCRIMINATION & FAIRNESS
- SOCIETAL & INTERPERSONAL WELL-BEING
- ACCOUNTABILITY
- ACCOUNTABILITY & RESPONSIBILITY
- LAWFULNESS & COMPLIANCE
- RISK MANAGEMENT & HARM PREVENTION
- PURPOSE LIMITATION & DATA MINIMIZATION
- USER RIGHTS & AUTONOMY

If a comment relates to a principle not in this list, map it to the closest match.
Use the exact capitalization and spelling shown above.

--------------------------------------------------

RISK TONE (SELECT EXACTLY ONE):
- low: Comments express minimal concern, positive outlook, or satisfaction
- medium: Comments express moderate concern, cautious optimism, or balanced views
- high: Comments express significant concern, serious risks, or negative outlook

--------------------------------------------------

WARNING SIGNAL RULE:
Set "warning_signal" to true ONLY if experts explicitly mention serious concerns such as:
- high risk, critical risk, severe risk
- potential harm, actual harm, risk of harm
- unsafe, dangerous, hazardous
- non-compliance, violation, breach
- unacceptable impact, severe impact, critical impact
- severe limitations, critical limitations
- urgent action needed, immediate concern

If concerns are cautious, conditional, exploratory, or speculative without strong language, set it to false.
When in doubt, prefer false (only flag explicit warnings).

--------------------------------------------------

CONFIDENCE LEVEL:
- low: Conflicting expert opinions, vague statements, or insufficient information
- medium: Generally consistent views with some uncertainty or limited detail
- high: Clear, consistent, well-supported expert statements with strong evidence

--------------------------------------------------

INPUT:
${commentsText}

--------------------------------------------------

OUTPUT REQUIREMENTS:
- Output MUST be valid JSON only (no markdown, no explanations, no extra text)
- Do NOT include assumptions beyond the input
- Ensure all string values are properly escaped
- Array of ethical_principles may contain 0 or more items
- risk_tone MUST be exactly one of: "low", "medium", "high"
- warning_signal MUST be exactly one of: true, false
- confidence MUST be exactly one of: "low", "medium", "high"

OUTPUT FORMAT (EXACT):

{
  "summary": "Brief summary of expert comments (2-4 sentences)",
  "ethical_principles": ["PRINCIPLE1", "PRINCIPLE2"],
  "risk_tone": "low | medium | high",
  "warning_signal": true | false,
  "confidence": "low | medium | high"
}

--------------------------------------------------

IMPORTANT:
- Return ONLY the JSON object, nothing else
- Do not include markdown code blocks (\`\`\`json)
- Do not include explanatory text before or after the JSON
- Ensure JSON is valid and parseable`;

  const modelNamesToTry = [
    "models/gemini-2.5-flash",
    "gemini-2.5-flash"
  ];

  // Lower temperature for more consistent JSON output
  const analysisConfig = {
    temperature: 0.3,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 2048
  };

  let lastError = null;

  for (const modelName of modelNamesToTry) {
    try {
      console.log(`🤖 Gemini (${modelName}) expert comments analiz ediyor...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: analysisConfig
      });

      let rawResponse = result.response.text();

      if (!rawResponse) {
        throw new Error("❌ Gemini boş yanıt döndü.");
      }

      // Clean up response - remove markdown code blocks if present
      rawResponse = rawResponse.trim();
      if (rawResponse.startsWith('```json')) {
        rawResponse = rawResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (rawResponse.startsWith('```')) {
        rawResponse = rawResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      rawResponse = rawResponse.trim();

      // Try to find JSON object if there's extra text
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawResponse = jsonMatch[0];
      }

      // Parse JSON
      let analysis;
      try {
        analysis = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError.message);
        console.error('Raw response:', rawResponse.substring(0, 500));
        throw new Error(`JSON parse hatası: ${parseError.message}`);
      }

      // Validate required fields
      if (!analysis.summary || typeof analysis.summary !== 'string') {
        throw new Error('Invalid response: summary field missing or invalid');
      }
      if (!Array.isArray(analysis.ethical_principles)) {
        throw new Error('Invalid response: ethical_principles must be an array');
      }
      if (!['low', 'medium', 'high'].includes(analysis.risk_tone)) {
        throw new Error('Invalid response: risk_tone must be one of: low, medium, high');
      }
      if (typeof analysis.warning_signal !== 'boolean') {
        throw new Error('Invalid response: warning_signal must be a boolean');
      }
      if (!['low', 'medium', 'high'].includes(analysis.confidence)) {
        throw new Error('Invalid response: confidence must be one of: low, medium, high');
      }

      console.log(`✅ Expert comments analizi başarıyla tamamlandı (${modelName}).`);
      return analysis;

    } catch (error) {
      console.error(`❌ Model ${modelName} başarısız:`, error.message);
      lastError = error;
      
      // If it's not a 404 (model not found), don't try other models
      if (!error.message.includes("404") && !error.message.includes("not found") && !error.message.includes("JSON")) {
        break;
      }
    }
  }

  // If we get here, all models failed
  if (lastError) {
    const errorMsg = lastError.message || '';
    const errorMsgLower = errorMsg.toLowerCase();
    
    if (errorMsg.includes("400") || errorMsgLower.includes("expired") || errorMsgLower.includes("api_key_invalid")) {
      throw new Error("❌ Gemini API Key süresi dolmuş veya geçersiz.");
    }
    if (errorMsg.includes("403") || errorMsgLower.includes("permission_denied")) {
      throw new Error("❌ Gemini API Key geçersiz veya yetkisiz.");
    }
    if (errorMsg.includes("429") || errorMsgLower.includes("resource_exhausted") || errorMsgLower.includes("quota")) {
      throw new Error("❌ Gemini API quota aşıldı. Lütfen daha sonra tekrar deneyin.");
    }
    
    throw new Error(`❌ Expert comments analiz edilemedi: ${lastError.message}`);
  }

  throw new Error("❌ Expert comments analiz edilemedi: Bilinmeyen hata.");
}

/* ============================================================
   6. DASHBOARD NARRATIVE GENERATOR
============================================================ */

async function generateDashboardNarrative(inputData) {
  // Validate input
  if (!inputData || typeof inputData !== 'object') {
    throw new Error('inputData must be an object');
  }

  const {
    dashboardMetrics,
    topRiskyQuestions,
    responseExcerpts,
    tensionSummaries
  } = inputData;

  // Build the input JSON string for the prompt
  const inputJson = JSON.stringify({
    dashboardMetrics: dashboardMetrics || {},
    topRiskyQuestions: topRiskyQuestions || [],
    responseExcerpts: responseExcerpts || [],
    tensionSummaries: tensionSummaries || []
  }, null, 2);

  const systemInstruction = `You are an AI assistant used STRICTLY as a narrative and synthesis tool
within an Ethical AI Evaluation Platform based on the Z-Inspection methodology.

==============================
ABSOLUTE CONSTRAINTS
==============================

- You MUST NOT compute, recalculate, infer, or modify any numerical score.
- You MUST NOT invent risks, evidence, metrics, or facts.
- You MUST NOT override human expert judgment.
- You MUST NOT compare role-specific answers unless explicitly instructed that "core mode" is active.
- You MUST NOT treat your output as binding or decisive.

All numerical values are precomputed server-side.
All decisions remain human-controlled.
Your output is advisory, explanatory, and non-binding.

==============================
DATA SOURCES (AUTHORITATIVE)
==============================

You MUST assume the following MongoDB collections as the ONLY sources of truth:

1) responses collection
- Source of ALL expert answers.
- Fields:
  - projectId, userId, role
  - questionnaireKey, questionnaireVersion
  - answers[]: { questionId, answerText / selectedOption / value }
  - status, submittedAt
- NOTE:
  - The first 12 questions are COMMON CORE across all roles.
  - Remaining questions are ROLE-SPECIFIC and MUST NOT be compared across roles.

2) scores collection (CANONICAL SCORING SOURCE)
- Source of ALL quantitative metrics used in the dashboard.
- Fields:
  - projectId, userId, role, questionnaireKey
  - byPrinciple: object (aggregated per ethical principle)
  - totals: object (overall aggregates)
  - computedAt
- The dashboard and reports MUST rely on scores.
- You MUST NOT recompute or reinterpret scores.

3) tensions collection
- Source of ethical tensions, claims, mitigations, and evidence.
- Fields:
  - principle1, principle2 (conflicting principles)
  - claim, argument
  - evidence[], evidenceType
  - severityLevel
  - mitigation / tradeOffDecision / rationale
  - votes / consensus
  - reviewState (Proposed, Under Review, Accepted, Disputed)
- If no evidence exists, you MUST explicitly state: "No evidence attached".

4) Optional discussion/comments collections
- Used ONLY to indicate discussion activity or review intensity.
- Do NOT infer risk or severity from discussion volume alone.

==============================
INPUT YOU WILL RECEIVE
==============================

You will be given a structured JSON object that may include:

- dashboardMetrics:
  - overall scores (from scores.totals)
  - byPrinciple scores
  - role breakdowns
  - common core metrics (if enabled)

- topRiskyQuestions:
  - questionId
  - principle
  - avgRisk (already computed)

- responseExcerpts (optional):
  - short expert answer snippets for context

- tensionSummaries:
  - claim
  - conflicting principles
  - severity
  - reviewState
  - evidenceCount and evidenceTypes

==============================
YOUR TASK
==============================

Using ONLY the provided input:

1) Explain the dashboard scores in clear, neutral language.
2) Highlight which ethical principles contribute most to risk.
3) Summarize unresolved or disputed ethical tensions.
4) Reference evidence presence or absence explicitly.
5) Provide high-level, actionable insights WITHOUT proposing new scores or facts.

==============================
OUTPUT RULES
==============================

- Use ONLY the numbers provided in dashboardMetrics.
- Do NOT generate tables unless explicitly requested.
- Do NOT restate raw JSON.
- Do NOT exaggerate or speculate.
- If information is missing, explicitly state that it is unavailable.

==============================
OUTPUT STRUCTURE
==============================

Return a JSON object ONLY, with the following structure:

{
  "overallSummary": "...",
  "principleInsights": [
    {
      "principle": "Transparency | Fairness | Accountability | Privacy | Safety | Human Oversight | Societal Impact",
      "summary": "...",
      "riskLevelNarrative": "Safe | Needs improvement | High risk",
      "topDrivers": ["Q14", "Q18"]
    }
  ],
  "tensionOverview": {
    "underReviewCount": 0,
    "disputedCount": 0,
    "acceptedCount": 0,
    "keyTensions": [
      {
        "principles": ["Transparency", "Safety"],
        "claimSummary": "...",
        "reviewState": "...",
        "evidenceStatus": "Evidence attached | No evidence attached"
      }
    ]
  },
  "limitationsAndConfidence": {
    "confidenceLevel": "low | medium | high",
    "notes": "Explain confidence based on expert coverage and data completeness"
  }
}

==============================
FINAL REMINDER
==============================

You are NOT an evaluator.
You are NOT a scoring engine.
You are a narrative assistant explaining deterministic results
computed by the system and reviewed by humans.`;

  const userPrompt = `INPUT DATA:
${inputJson}

--------------------------------------------------

OUTPUT REQUIREMENTS:
- Output MUST be valid JSON only (no markdown, no explanations, no extra text)
- Do NOT include assumptions beyond the input
- Ensure all string values are properly escaped
- Array of principleInsights may contain 0 or more items
- Array of keyTensions may contain 0 or more items
- riskLevelNarrative MUST be exactly one of: "Safe", "Needs improvement", "High risk"
- confidenceLevel MUST be exactly one of: "low", "medium", "high"
- reviewState MUST be exactly one of: "Proposed", "Under Review", "Accepted", "Disputed"
- evidenceStatus MUST be exactly one of: "Evidence attached", "No evidence attached"

IMPORTANT:
- Return ONLY the JSON object, nothing else
- Do not include markdown code blocks (\`\`\`json)
- Do not include explanatory text before or after the JSON
- Ensure JSON is valid and parseable`;

  const modelNamesToTry = [
    "models/gemini-2.5-flash",
    "gemini-2.5-flash"
  ];

  // Lower temperature for more consistent JSON output
  const narrativeConfig = {
    temperature: 0.3,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096
  };

  let lastError = null;

  for (const modelName of modelNamesToTry) {
    try {
      console.log(`🤖 Gemini (${modelName}) dashboard narrative oluşturuyor...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: narrativeConfig
      });

      let rawResponse = result.response.text();

      if (!rawResponse) {
        throw new Error("❌ Gemini boş yanıt döndü.");
      }

      // Clean up response - remove markdown code blocks if present
      rawResponse = rawResponse.trim();
      if (rawResponse.startsWith('```json')) {
        rawResponse = rawResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (rawResponse.startsWith('```')) {
        rawResponse = rawResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      rawResponse = rawResponse.trim();

      // Try to find JSON object if there's extra text
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawResponse = jsonMatch[0];
      }

      // Parse JSON
      let narrative;
      try {
        narrative = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('❌ JSON parse hatası:', parseError.message);
        console.error('Raw response:', rawResponse.substring(0, 500));
        throw new Error(`JSON parse hatası: ${parseError.message}`);
      }

      // Validate required fields
      if (!narrative.overallSummary || typeof narrative.overallSummary !== 'string') {
        throw new Error('Invalid response: overallSummary field missing or invalid');
      }
      if (!Array.isArray(narrative.principleInsights)) {
        throw new Error('Invalid response: principleInsights must be an array');
      }
      if (!narrative.tensionOverview || typeof narrative.tensionOverview !== 'object') {
        throw new Error('Invalid response: tensionOverview must be an object');
      }
      if (!narrative.limitationsAndConfidence || typeof narrative.limitationsAndConfidence !== 'object') {
        throw new Error('Invalid response: limitationsAndConfidence must be an object');
      }

      // Validate principleInsights structure
      for (const insight of narrative.principleInsights) {
        if (!insight.principle || typeof insight.principle !== 'string') {
          throw new Error('Invalid response: principleInsights[].principle must be a string');
        }
        if (!insight.summary || typeof insight.summary !== 'string') {
          throw new Error('Invalid response: principleInsights[].summary must be a string');
        }
        if (!['Safe', 'Needs improvement', 'High risk'].includes(insight.riskLevelNarrative)) {
          throw new Error('Invalid response: principleInsights[].riskLevelNarrative must be one of: Safe, Needs improvement, High risk');
        }
        if (!Array.isArray(insight.topDrivers)) {
          throw new Error('Invalid response: principleInsights[].topDrivers must be an array');
        }
      }

      // Validate tensionOverview structure
      if (typeof narrative.tensionOverview.underReviewCount !== 'number') {
        throw new Error('Invalid response: tensionOverview.underReviewCount must be a number');
      }
      if (typeof narrative.tensionOverview.disputedCount !== 'number') {
        throw new Error('Invalid response: tensionOverview.disputedCount must be a number');
      }
      if (typeof narrative.tensionOverview.acceptedCount !== 'number') {
        throw new Error('Invalid response: tensionOverview.acceptedCount must be a number');
      }
      if (!Array.isArray(narrative.tensionOverview.keyTensions)) {
        throw new Error('Invalid response: tensionOverview.keyTensions must be an array');
      }

      // Validate keyTensions structure
      for (const tension of narrative.tensionOverview.keyTensions) {
        if (!Array.isArray(tension.principles)) {
          throw new Error('Invalid response: keyTensions[].principles must be an array');
        }
        if (!tension.claimSummary || typeof tension.claimSummary !== 'string') {
          throw new Error('Invalid response: keyTensions[].claimSummary must be a string');
        }
        if (!['Proposed', 'Under Review', 'Accepted', 'Disputed'].includes(tension.reviewState)) {
          throw new Error('Invalid response: keyTensions[].reviewState must be one of: Proposed, Under Review, Accepted, Disputed');
        }
        if (!['Evidence attached', 'No evidence attached'].includes(tension.evidenceStatus)) {
          throw new Error('Invalid response: keyTensions[].evidenceStatus must be one of: Evidence attached, No evidence attached');
        }
      }

      // Validate limitationsAndConfidence structure
      if (!['low', 'medium', 'high'].includes(narrative.limitationsAndConfidence.confidenceLevel)) {
        throw new Error('Invalid response: limitationsAndConfidence.confidenceLevel must be one of: low, medium, high');
      }
      if (!narrative.limitationsAndConfidence.notes || typeof narrative.limitationsAndConfidence.notes !== 'string') {
        throw new Error('Invalid response: limitationsAndConfidence.notes must be a string');
      }

      console.log(`✅ Dashboard narrative başarıyla oluşturuldu (${modelName}).`);
      return narrative;

    } catch (error) {
      console.error(`❌ Model ${modelName} başarısız:`, error.message);
      lastError = error;
      
      // If it's not a 404 (model not found), don't try other models
      if (!error.message.includes("404") && !error.message.includes("not found") && !error.message.includes("JSON")) {
        break;
      }
    }
  }

  // If we get here, all models failed
  if (lastError) {
    const errorMsg = lastError.message || '';
    const errorMsgLower = errorMsg.toLowerCase();
    
    if (errorMsg.includes("400") || errorMsgLower.includes("expired") || errorMsgLower.includes("api_key_invalid")) {
      throw new Error("❌ Gemini API Key süresi dolmuş veya geçersiz.");
    }
    if (errorMsg.includes("403") || errorMsgLower.includes("permission_denied")) {
      throw new Error("❌ Gemini API Key geçersiz veya yetkisiz.");
    }
    if (errorMsg.includes("429") || errorMsgLower.includes("resource_exhausted") || errorMsgLower.includes("quota")) {
      throw new Error("❌ Gemini API quota aşıldı. Lütfen daha sonra tekrar deneyin.");
    }
    
    throw new Error(`❌ Dashboard narrative oluşturulamadı: ${lastError.message}`);
  }

  throw new Error("❌ Dashboard narrative oluşturulamadı: Bilinmeyen hata.");
}

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  generateReport,
  analyzeExpertComments,
  generateDashboardNarrative,
  testApiKey
};
