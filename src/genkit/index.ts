import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Use the exact model string confirmed working on v1beta
export const ai = genkit({
    plugins: [googleAI()],
    model: 'googleai/gemini-2.5-flash',
});
