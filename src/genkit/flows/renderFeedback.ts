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
          Output: Single flowing paragraph, NO headings and NO bullet points whatsoever.
          Length: 150-250 words.
          Content: Describe the activities we covered (not as a list — weave them into sentences), what went well, what to work on next, and homework if assigned.
          Crucially: explain WHY you covered what you covered — what skill or gap it addresses — so the reader understands the pedagogy.
          Tone: polished, warm, teacher-clarity. Human, not corporate.
        `;
                break;
            case 'intergreat':
                platformInstructions = `
          Output must use EXACT plain-text headings in EXACT order. DO NOT use markdown like "##" or "**". Just the plain text heading on its own line:
          1. Knowledge reviewed
          2. New knowledge
          3. Areas for improvement
          4. Progress made
          5. Homework assigned
          6. Next lesson preview

          CRITICAL FORMATTING RULES:
          - Write in full, flowing PROSE under each heading. NO bullet points. NO lists. NO dashes.
          - Do NOT use bullet points anywhere.

          LENGTH: Aim for 200-300 words total. Each section gets at least 2-3 sentences.

          SECTION-SPECIFIC GUIDANCE:
          
          "Knowledge reviewed": Describe the topics and activities we did this session as connected prose. Explain the purpose behind each task — what skill it was building and why that matters for ${studentName}'s English development overall.

          "New knowledge": Describe any new vocabulary, grammar structures, or concepts introduced. For each, briefly justify WHY it was introduced — what it does for ${studentName}'s English (e.g. helps with range, expressiveness, accuracy, fluency).

          "Areas for improvement": Be warm but honest. Recognise a genuine strength first, then identify 1-2 specific weaknesses with a concrete, practical suggestion for how to fix each one. Make this feel personal — tied to what actually happened in the session, not generic advice.

          "Progress made": Note observable progress from this session specifically.

          "Homework assigned": State it clearly and briefly.

          "Next lesson preview": One or two sentences on what's coming up and why.

          Parent-safe, evidence-based, no sensitive or mental health content.
        `;
                break;
            case 'privateTutee':
                platformInstructions = `
          Output must use EXACT headings. You may use markdown "##" for these:
          - Wins
          - Next steps
          - Homework

          Length: 80-150 words total.
          Formatting: MAXIMUM 3 bullet points under "Wins" and "Next steps". Do not exceed 3 bullets per section.
          Within each bullet, write a complete sentence — not just a label. Include a specific reason or detail.
          Tone: Friendly, direct, action-oriented. A little warmth is good.
        `;
                break;
            case 'keystoneQuick':
                platformInstructions = `
          Output: Quick post-lesson summary.
          Summary: 3-4 sentences in prose (what we did and why).
          Focus next lesson: one clear sentence.
          Length: 60-100 words total.
        `;
                break;
        }

        const personaInstructions = getPersonaForStudent(studentName || 'General');

        const response = await ai.generate({
            prompt: `
        You are a professional educational writer and tutor.
        Your job is to take structured "truth JSON" from a tutoring session and write feedback tailored for a specific platform.
        
        THE STUDENT'S NAME IS: ${studentName || 'the student'}
        Use this name naturally throughout. DO NOT use any other student's name.
        
        ABSOLUTE RULES:
        - You MUST NOT introduce any claims not present in the truth JSON.
        - You MUST NOT include anything from 'tutor_private_notes'.
        - You MUST reference SPECIFIC things from the session — actual words covered, specific exercises, what the student said or did.
        - Be CONCRETE. No vague generalisations. If a vocabulary word is in the data, name it. If a technique was practised, describe it.
        - AVOID bullet points and lists unless the platform explicitly instructs them. Prefer flowing prose.
        - Add a small touch of human warmth — a moment of genuine enthusiasm, a small observation — so the feedback doesn't feel machine-generated.
        - Where relevant, build a bridge to previous feedback themes (e.g. if a recurring area for improvement appears again, acknowledge the pattern and frame it as something to keep working on).

        --- TUTOR PERSONA & VOICE ---
        ${personaInstructions}
        -----------------------------

        PLATFORM INSTRUCTIONS (follow these precisely — they override style defaults where they conflict):
        ${platformInstructions}

        TRUTH JSON DATA:
        ---
        ${truthStr}
        ---
      `,
            config: {
                temperature: 0.4,
            }
        });

        return response.text;
    }
);
