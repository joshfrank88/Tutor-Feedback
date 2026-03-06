import { ai } from '@/genkit';
import { z } from 'genkit';
import { ExtractedTruthSchema } from '../schemas';
import { getPersonaForStudent } from '@/lib/personas';

export const renderFeedbackFlow = ai.defineFlow(
    {
        name: 'renderFeedbackFlow',
        inputSchema: z.object({
            extractedTruth: ExtractedTruthSchema,
            platform: z.enum(['humanities', 'intergreat', 'privateTutee', 'keystoneQuick']),
            studentName: z.string().optional(),
        }),
        outputSchema: z.string(),
    },
    async ({ extractedTruth, platform, studentName }) => {

        // Formatting the truth as a readable string to feed to Gemini
        const truthStr = JSON.stringify(extractedTruth, null, 2);

        let platformInstructions = '';

        switch (platform) {
            case 'humanities':
                platformInstructions = `
          Output: Single paragraph, NO headings and NO bullets.
          Length: 100-200 words.
          Must mention: what we covered, what went well, what needs improvement, what's next. 
          If homework is in the data, mention it briefly (one sentence).
          Tone: polished, explanatory, teacher clarity.
        `;
                break;
            case 'intergreat':
                platformInstructions = `
          Output must use EXACT text headings in EXACT order. DO NOT use markdown like "##" or "**" for these headings. Just the plain text:
          1. Knowledge reviewed
          2. New knowledge
          3. Areas for improvement
          4. Progress made
          5. Homework assigned
          6. Next lesson preview
          
          Length constraints: 50-140 words total. (Enforce this strictly).
          Important: Parent-safe, warm-professional, evidence-based. No extra headings allowed. No sensitive or mental health speculation.
        `;
                break;
            case 'privateTutee':
                platformInstructions = `
          Output must use EXACT headings. You may use markdown "##" for these headings:
          - Wins
          - Next steps
          - Homework
          
          Length constraints: 60-120 words total.
          Formatting: MAXIMUM 3 bullet points under "Wins" and "Next steps". Do not exceed 3 bullets per section.
          Tone: Friendly, concise, action-oriented.
        `;
                break;
            case 'keystoneQuick':
                platformInstructions = `
          Output: After-lesson quick summary. 
          Summary portion: 2-3 sentences.
          Focus next lesson: one line.
          Length constraints: 40-90 words total.
        `;
                break;
        }

        const personaInstructions = getPersonaForStudent(studentName || 'General');

        const response = await ai.generate({
            prompt: `
        You are a professional educational writer and tutor.
        Your job is to take the structured strict "truth JSON" from a tutoring session and generate feedback tailored for a specific platform.
        
        THE STUDENT'S NAME IS: ${studentName || 'the student'}
        Use this name throughout the feedback. DO NOT use any other student's name.
        
        You MUST NOT introduce new claims that are not in the truth JSON.
        You MUST NOT include anything from 'tutor_private_notes'.
        You MUST reference SPECIFIC things from the session (e.g. actual words covered, specific skills worked on).
        Be CONCRETE — mention actual vocabulary, topics, or exercises from the data, not just vague generalisations.

        --- TUTOR PERSONA & VOICE ---
        ${personaInstructions}
        -----------------------------

        PLATFORM INSTRUCTIONS:
        ${platformInstructions}

        TRUTH JSON DATA:
        ---
        ${truthStr}
        ---
      `,
            config: {
                temperature: 0.3,
            }
        });

        return response.text;
    }
);
