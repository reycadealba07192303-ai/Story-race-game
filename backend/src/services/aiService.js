const Groq = require('groq-sdk');
const { GoogleGenAI } = require('@google/genai');

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const gemini = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const GROQ_MODELS = [
  process.env.GROQ_MODEL,
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
].filter(Boolean);

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function extractJsonText(raw) {
  if (!raw) return '';
  let text = String(raw).trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function extractGroqText(message) {
  const content = (message?.content || '').trim();
  if (content) return content;
  return (message?.reasoning || '').trim();
}

async function generateWithGroq(prompt) {
  if (!groq) throw new Error('GROQ_API_KEY is not configured.');

  let lastError = null;
  for (const model of [...new Set(GROQ_MODELS)]) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 6000,
      });
      const message = completion.choices[0]?.message;
      const text = extractGroqText(message);
      if (!text) {
        throw new Error(`Groq model "${model}" returned an empty response.`);
      }
      return { provider: 'groq', model, text };
    } catch (err) {
      lastError = err;
      console.warn(`Groq model "${model}" failed:`, err.message);
    }
  }
  throw lastError || new Error('All Groq models failed.');
}

async function generateWithGemini(prompt) {
  if (!gemini) throw new Error('GEMINI_API_KEY is not configured.');

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: 0.7,
      maxOutputTokens: 8000,
      responseMimeType: 'application/json',
    },
  });

  const text = (response.text || '').trim();
  if (!text) throw new Error(`Gemini model "${GEMINI_MODEL}" returned an empty response.`);
  return { provider: 'gemini', model: GEMINI_MODEL, text };
}

/**
 * Generate campaign JSON text using Groq first, then Gemini as fallback.
 */
async function generateCampaignJson(prompt) {
  const errors = [];

  if (groq) {
    try {
      return await generateWithGroq(prompt);
    } catch (err) {
      errors.push(`Groq: ${err.message}`);
      console.warn('Groq generation failed, trying Gemini fallback...', err.message);
    }
  } else {
    errors.push('Groq: GROQ_API_KEY is not configured.');
  }

  if (gemini) {
    try {
      return await generateWithGemini(prompt);
    } catch (err) {
      errors.push(`Gemini: ${err.message}`);
    }
  } else {
    errors.push('Gemini: GEMINI_API_KEY is not configured.');
  }

  throw new Error(errors.join(' | '));
}

function parseCampaignJson(text) {
  const jsonText = extractJsonText(text);
  if (!jsonText) throw new Error('AI returned an empty response.');
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${err.message}`);
  }
}

module.exports = {
  generateCampaignJson,
  parseCampaignJson,
};
