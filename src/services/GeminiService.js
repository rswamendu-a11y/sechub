export const GeminiService = {
  API_KEY: 'YOUR_GEMINI_API_KEY_HERE', // Placeholder as requested
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',

  async chat(history, contextData) {
    try {
      const systemPrompt = `
        You are an AI assistant for a Sales Tracker app.
        You have access to the user's sales data and profile.

        Context Data (JSON):
        ${JSON.stringify(contextData)}

        Answer questions about their sales, incentives, and performance based on this data.
        Keep answers concise and helpful.
        If the user asks about "Total Volume", sum up the quantities.
        If the user asks about "Total Value", sum up the totals.
      `;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...history.map(msg => ({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }))
      ];

      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      return data.candidates[0].content.parts[0].text;

    } catch (error) {
      console.error("Gemini Error:", error);
      return "I'm having trouble connecting to the AI right now. Please check your API Key.";
    }
  }
};
