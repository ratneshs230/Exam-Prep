import { GoogleGenAI, Type } from "@google/genai";
import { Question, Subject, Difficulty } from '../types';
import { StorageService } from './storageService';

// Helper to get the current API key (user-provided takes priority)
const getApiKey = (): string => {
  const userKey = StorageService.loadApiKey();
  return userKey || process.env.API_KEY || '';
};

// Helper to get AI client with current API key
const getAIClient = (): GoogleGenAI | null => {
  const key = getApiKey();
  if (!key) return null;
  return new GoogleGenAI({ apiKey: key });
};

export const GeminiService = {
  /**
   * Parses raw text content into structured MCQ objects.
   */
  async parseMCQsFromText(text: string): Promise<Omit<Question, 'id'>[]> {
    if (!getApiKey()) {
      console.warn("No API Key provided. Returning mock empty array.");
      return [];
    }

    const modelId = "gemini-2.5-flash";
    const prompt = `
      You are an expert data extraction assistant for an exam preparation app.
      Analyze the following text (which may be from a Markdown or plain text document) and extract all Multiple Choice Questions (MCQs).
      
      For each question, deduce the:
      - Subject (Polity, Economy, Governance, General Awareness)
      - Difficulty (Easy, Medium, Hard)
      - Correct Option Index (0 for A, 1 for B, 2 for C, 3 for D)
      - Explanation (if present, otherwise generate a concise one based on the context)

      Input Text:
      ${text.substring(0, 30000)} // Truncate to avoid token limits in this demo
    `;

    try {
      const ai = getAIClient();
      if (!ai) throw new Error("No API key configured");
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER, description: "0 for A, 1 for B, etc." },
                explanation: { type: Type.STRING },
                subject: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["text", "options", "correctAnswerIndex", "explanation", "subject", "difficulty"]
            }
          }
        }
      });

      const json = JSON.parse(response.text || '[]');
      
      // Map string subject/difficulty to Enums safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return json.map((q: any) => ({
        text: q.text,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation,
        subject: Object.values(Subject).includes(q.subject) ? q.subject : Subject.GENERAL_AWARENESS,
        difficulty: Object.values(Difficulty).includes(q.difficulty) ? q.difficulty : Difficulty.MEDIUM,
        tags: q.tags || [],
        monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }));

    } catch (error) {
      console.error("Gemini Parsing Error:", error);
      throw new Error("Failed to parse MCQs from the document.");
    }
  },

  /**
   * Generates a tutor-like explanation or hint.
   */
  async getTutorResponse(
    question: Question, 
    userAnswerIndex: number | null, 
    mode: 'EXPLAIN' | 'HINT' | 'WHY_WRONG'
  ): Promise<string> {
    if (!getApiKey()) return "AI features unavailable without API Key.";

    const modelId = "gemini-2.5-flash";
    let prompt = "";

    const qContext = `
      Question: ${question.text}
      Options: ${question.options.join(', ')}
      Correct Answer: ${question.options[question.correctAnswerIndex]}
      Provided Explanation: ${question.explanation}
    `;

    if (mode === 'HINT') {
      prompt = `
        You are a helpful tutor. Provide a subtle hint for the following question WITHOUT revealing the answer.
        Help the student eliminate one wrong option if possible.
        ${qContext}
      `;
    } else if (mode === 'EXPLAIN') {
      prompt = `
        You are an expert tutor. Provide a detailed but concise explanation for why the answer is correct. 
        Use the provided explanation as a base but expand slightly for clarity.
        ${qContext}
      `;
    } else if (mode === 'WHY_WRONG') {
      const userAns = userAnswerIndex !== null ? question.options[userAnswerIndex] : "The option selected";
      prompt = `
        You are a helpful tutor. The student chose '${userAns}' which is incorrect. 
        Explain specifically why this option is wrong compared to the correct answer.
        ${qContext}
      `;
    }

    try {
      const ai = getAIClient();
      if (!ai) throw new Error("No API key configured");
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
      });
      return response.text || "I couldn't generate a response at this time.";
    } catch (error) {
      console.error("Gemini Tutor Error:", error);
      return "Sorry, I'm having trouble connecting to the AI tutor right now.";
    }
  },

  /**
   * Curates a custom practice set based on user requirements.
   */
  async curatePracticeSet(
    allQuestions: Question[],
    requirements: { count: number; subject: string; focus?: string }
  ): Promise<string[]> {
    if (!getApiKey()) {
      // Fallback for no API key: simple random filter
      return allQuestions
        .filter(q => requirements.subject === 'All' || q.subject === requirements.subject)
        .sort(() => 0.5 - Math.random())
        .slice(0, requirements.count)
        .map(q => q.id);
    }

    // 1. Filter by subject first to reduce token usage
    let candidates = allQuestions;
    if (requirements.subject !== 'All') {
      candidates = allQuestions.filter(q => q.subject === requirements.subject);
    }

    // If pool is small, just return random subset
    if (candidates.length <= requirements.count) {
      return candidates.map(q => q.id);
    }

    // 2. Prepare concise metadata for the AI
    // We limit to 50 candidates to avoid huge prompts in this demo
    const safeCandidates = candidates.sort(() => 0.5 - Math.random()).slice(0, 50);
    const metadata = safeCandidates.map(q => ({
      id: q.id,
      difficulty: q.difficulty,
      tags: q.tags,
      preview: q.text.substring(0, 60) + "..."
    }));

    const prompt = `
      You are an expert exam coordinator. Create a practice set of exactly ${requirements.count} questions from the provided list.
      
      Criteria:
      - Subject: ${requirements.subject}
      - User Focus Area: ${requirements.focus || 'General practice, well-balanced'}
      - Goal: Select the questions that best match the focus area. If the focus is generic, prioritize a mix of difficulties.

      Candidate Questions (JSON):
      ${JSON.stringify(metadata)}
      
      Return ONLY a JSON array of the selected question IDs. Example: ["id1", "id2"]
    `;

    try {
      const ai = getAIClient();
      if (!ai) throw new Error("No API key configured");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const selectedIds = JSON.parse(response.text || '[]');
      
      // Fallback if AI returns empty or invalid
      if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        throw new Error("Empty selection from AI");
      }
      
      return selectedIds;
    } catch (error) {
      console.error("AI Curation failed, falling back to random:", error);
      return candidates
        .sort(() => 0.5 - Math.random())
        .slice(0, requirements.count)
        .map(q => q.id);
    }
  }
};