
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
const API_KEY_STORAGE = "@flippo_gemini_key";

// Default prompt engineering
const SYSTEM_PROMPT = `
You are an expert reseller assistant. Parse the input text into a JSON object for an inventory item.
Output ONLY valid JSON. No markdown.
Fields: title, description, category (Women, Men, Kids, Electronics, Videogames, Home, Entertainment, Sports, Collectibles, Pets, Motors), brand, size, condition, price (number), color.
If info is missing, make a best guess or leave null.
`;

export const AIService = {
    setApiKey: async (key: string) => {
        await AsyncStorage.setItem(API_KEY_STORAGE, key);
    },

    getApiKey: async () => {
        return await AsyncStorage.getItem(API_KEY_STORAGE);
    },

    parseListing: async (text: string) => {
        try {
            const key = await AIService.getApiKey();
            if (!key) throw new Error("API Key missing");

            const response = await fetch(`${GEMINI_API_URL}?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${SYSTEM_PROMPT}\n\nInput: "${text}"` }]
                    }]
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error.message);

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("No response from AI");

            // Clean markdown if present
            const jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (e) {
            console.error("AI Parse Error:", e);
            throw e;
        }
    }
};
