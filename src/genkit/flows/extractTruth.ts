import { ai } from '@/genkit';
import { z } from 'genkit';
import { ExtractedTruthSchema } from '../schemas';

export const extractTruthFlow = ai.defineFlow(
    {
        name: 'extractTruthFlow',
        inputSchema: z.object({
            rawText: z.string(),
            studentName: z.string(),
        }),
        outputSchema: ExtractedTruthSchema,
    },
    async ({ rawText, studentName }) => {
        const response = await ai.generate({
            prompt: `
        You are an expert educational extractor.
        Analyze the following Granola notes from a tutoring session with a student named ${studentName}.
        Extract the facts requested by the output schema strictly. 
        
        CRITICAL RULE:
        Every claim in 'knowledge_reviewed', 'new_knowledge', 'strengths', and 'areas_for_improvement' MUST have 'evidence' attached. 
        Evidence can be a short exact quote snippet from the notes.
        If a claim cannot be backed up by evidence in the text, DO NOT include it or mark missing_info_flag as true.
        Do NOT guess or hallucinate.
        
        GRANOLA NOTES RULES:
        The notes contain a high-level summary and key points extracted by Granola.
        - FOCUS STRICTLY on the educational content, what the student learned, and the tutor's assessment of the student.
        - DO NOT extract the student's self-evaluations as facts unless corroborated by the tutor.

        Private, sensitive, pastoral, or mental health notes must be placed ONLY in 'tutor_private_notes' and NOT mentioned in any other field.
        
        Raw Notes:
        ---
        ${rawText}
        ---
      `,
            output: { schema: ExtractedTruthSchema },
            config: {
                temperature: 0.1, // Keep it grounded
            }
        });

        if (!response.output) {
            throw new Error('Failed to generate valid truth extraction.');
        }

        return response.output;
    }
);
