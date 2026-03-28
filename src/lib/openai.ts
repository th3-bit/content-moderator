export const OPENAI_CONFIG_KEY = "sikola_openai_config";

export interface OpenAIConfig {
  apiKey: string;
  systemPrompt: string;
  model: string;
}

export const getOpenAIConfig = (): OpenAIConfig | null => {
  const saved = localStorage.getItem(OPENAI_CONFIG_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

export const saveOpenAIConfig = (config: OpenAIConfig) => {
  localStorage.setItem(OPENAI_CONFIG_KEY, JSON.stringify(config));
};

export const generateLessonContent = async (topicTitle: string, config: OpenAIConfig, customPrompt?: string) => {
  if (!config.apiKey) throw new Error("API Key is missing. Please set it in AI Settings.");

  const prompt = `Topic: ${topicTitle}
${customPrompt ? `Additional Instructions: ${customPrompt}` : ""}

Generate a comprehensive educational lesson. The content must be structured to fit a slide-based mobile learning app.
Return the data ONLY as a valid JSON object with this exact structure:
{
  "title": "Clear Topic Title",
  "intro": "A concise introduction of what the student will learn (the goal).",
  "coreContent": "Detailed core explanation using markdown. Break it into readable paragraphs.",
  "examples": [
    {
      "title": "Example Title",
      "problem": "The problem or scenario to solve",
      "solution": "Step-by-step resolution",
      "keyTakeaway": "What is the single most important lesson from this example?"
    }
  ],
  "questions": [
    {
      // - 2+ Examples (Problem, Solution, Key Takeaway)
      // - 5+ Multiple Choice Questions (Question, Options, Correct Answer Index)
      "question": "A multiple choice question testing the core concept",
      "answers": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0
    }
  ]
}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: config.systemPrompt + " Always return valid JSON matching the requested schema." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to fetch from OpenAI");
  }

  const result = await response.json();
  try {
    return JSON.parse(result.choices[0].message.content);
  } catch (e) {
    console.error("Failed to parse OpenAI response:", result.choices[0].message.content);
    throw new Error("AI returned invalid data format. Please try again.");
  }
};
