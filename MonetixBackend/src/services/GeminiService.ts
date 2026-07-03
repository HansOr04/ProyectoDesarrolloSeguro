import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('GEMINI_API_KEY is not defined. AI alerts will be disabled.');
        }
        this.genAI = new GoogleGenerativeAI(apiKey || '');
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    private async wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private buildPrompt(recentData: { month: string; amount: number; type: 'income' | 'expense' | 'net' }[]): string {
        return `Actúa como un asesor financiero personal experto. Analiza los siguientes datos de transacciones mensuales:
${JSON.stringify(recentData)}

Genera 3 alertas o consejos cortos y directos (máximo 2 frases cada uno).
Enfócate en identificar en qué meses se gastó mucho y da una recomendación práctica para los meses futuros.
El formato de salida debe ser un ARRAY JSON de strings simple, por ejemplo:
["En enero gastaste mucho en comida, intenta cocinar más.", "Tu ahorro fue bajo en febrero, revisa tus suscripciones."]

NO incluyas markdown, solo el array JSON puro.`;
    }

    private async callGeminiAPI(prompt: string): Promise<string> {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    private parseAIResponse(rawText: string): string[] {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            const parsed = JSON.parse(cleaned);
            return Array.isArray(parsed) ? parsed.map(String) : [cleaned];
        } catch {
            return [rawText];
        }
    }

    async generateFinancialAlerts(
        monthlyData: { month: string; amount: number; type: 'income' | 'expense' | 'net' }[]
    ): Promise<string[]> {
        if (!process.env.GEMINI_API_KEY) {
            return ['AI alerts functionality is not configured.'];
        }

        const recentData = monthlyData.slice(-3);
        if (recentData.length === 0) {
            return ['No hay suficientes datos para generar alertas.'];
        }

        const prompt = this.buildPrompt(recentData);
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Gemini Attempt ${attempt}: Sending request...`);
                const rawText = await this.callGeminiAPI(prompt);
                return this.parseAIResponse(rawText);
            } catch (error: any) {
                console.error(`Gemini Error (Attempt ${attempt}):`, error.status || error.message);
                const isRateLimit = error.status === 429 || error.message?.includes('429');
                if (isRateLimit && attempt < maxRetries) {
                    const delay = 2000 * attempt;
                    console.log(`Rate limit hit. Retrying in ${delay}ms...`);
                    await this.wait(delay);
                    continue;
                }
                if (isRateLimit) return ['La IA está ocupada (Límite de cuota). Intenta de nuevo más tarde.'];
                return [`Error: ${(error.message || 'Desconocido').substring(0, 200)}`];
            }
        }
        return ['Error desconocido generando alertas.'];
    }
}

export const geminiService = new GeminiService();
