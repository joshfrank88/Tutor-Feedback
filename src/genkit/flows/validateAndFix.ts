import { ai } from '@/genkit';
import { z } from 'genkit';

export const validateAndFixFlow = ai.defineFlow(
    {
        name: 'validateAndFixFlow',
        inputSchema: z.object({
            draftText: z.string(),
            platform: z.enum(['humanities', 'intergreat', 'privateTutee', 'keystoneQuick']),
            validationErrors: z.array(z.string()),
        }),
        outputSchema: z.string(),
    },
    async ({ draftText, platform, validationErrors }) => {

        const response = await ai.generate({
            prompt: `
        You are a strict compliance editor.
        The following draft feedback for platform '${platform}' failed automated validation.
        
        FAILURES:
        ${validationErrors.join('\n')}
        
        DRAFT:
        ---
        ${draftText}
        ---

        REWRITE the draft so it strictly adheres to all constraints and fixes the failures listed above. 
        Maintain the exact same factual information. Do NOT hallucinate new claims.
        Only output the corrected text.
      `,
            config: {
                temperature: 0.1,
            }
        });

        return response.text;
    }
);
