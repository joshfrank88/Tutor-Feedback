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
        Analyze the following notes from a tutoring session with ${studentName}.
        Extract the facts requested by the output schema strictly.
        
        INPUT STRUCTURE:
        The notes may contain two sections:
        1. "Granola AI Summary" — a high-level structured overview of the session.
        2. "Verbatim Transcript" — the full word-for-word conversation, labelled "Tutor:" or "Student:".
        
        CRITICAL RULE:
        Every claim in 'knowledge_reviewed', 'new_knowledge', 'strengths', and 'areas_for_improvement' MUST have 'evidence' attached.
        PREFER evidence as direct quotes from the Verbatim Transcript — they are richer and more specific.
        For example: 'Student said: "I watched a film with my father at the cinema after school"'
        If a claim cannot be backed up by evidence in the text, DO NOT include it or mark missing_info_flag as true.
        Do NOT guess or hallucinate.
        
        EXTRACTION RULES:
        - FOCUS STRICTLY on educational content: what was taught, practised, corrected, and how the student responded.
        - Mine the transcript for SPECIFIC moments: errors the student made, corrections the tutor gave, vocabulary introduced, sentence structures practised.
        - DO NOT extract the student's self-evaluations as facts unless corroborated by the tutor.
        - Private, sensitive, pastoral, or mental health notes go ONLY in 'tutor_private_notes'.

        Session Notes:
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
