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
          - Write in full, flowing PROSE under each heading. NO bullet points. NO lists. NO dashes. Proper sentences and paragraphs only.

          LENGTH: 250-400 words total. Each section should be meaty — 3-5 sentences minimum.

          SECTION-SPECIFIC GUIDANCE:

          "Knowledge reviewed": This is the longest section. Name EACH activity or exercise by type (e.g. "sentence expansion drill", "homework review", "reading practice", "oral Q&A"). For each, describe what ${studentName} did, how they got on, and what the pedagogical purpose was — what English skill it develops and why it matters at this stage of their learning. Write it so a parent can picture exactly what happened in the lesson.

          "New knowledge": Name each new word, phrase, or grammar concept introduced. Then explain in plain English WHY we introduced it — what it adds to ${studentName}'s English toolkit (e.g. 'expands vocabulary range', 'helps produce more natural-sounding sentences', 'builds accuracy with tense'). Don't just state the item — justify its inclusion.

          "Areas for improvement": Open by genuinely recognising something ${studentName} is doing well or improving on. Then identify 1-2 specific things to keep working on — tied to actual moments from the session (e.g. a specific error pattern observed). Offer a concrete, practical suggestion for how to address each one. Make this feel personal and encouraging, not like a generic critique.

          "Progress made": A warm, honest assessment of what was accomplished. Draw on the student's energy, any moments of breakthrough, and the overall_session_feel field if available. This is where a touch of genuine enthusiasm belongs.

          "Homework assigned": State exactly what was set and why it supports the session's learning goals.

          "Next lesson preview": What's coming next and how it connects to what was covered today.

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
        You are a professional educational writer — warm, specific, and genuinely enthusiastic about teaching.
        Your job is to take richly structured "truth JSON" from a tutoring session and write feedback for a specific platform.
        
        THE STUDENT'S NAME IS: ${studentName || 'the student'}
        Use this name naturally throughout. DO NOT use any other student's name.
        
        THE JSON CONTAINS:
        - knowledge_reviewed / new_knowledge / strengths / areas_for_improvement:
          Each item has: 'claim' (what happened), 'exercise_type' (what kind of activity), 'student_performance' (how they did), 'evidence' (exact quote).
          USE ALL OF THESE FIELDS. 'exercise_type' tells you what to call the activity. 'student_performance' tells you how to describe their performance. 'evidence' gives you a real quote to anchor things.
        - overall_session_feel: A holistic sense of the session's energy and vibe. Use this to add warmth and authenticity.

        ABSOLUTE RULES:
        - Do NOT introduce any claims not in the truth JSON.
        - Do NOT include anything from 'tutor_private_notes'.
        - Name SPECIFIC exercises and activities by their type — don't say "we did some practice", say "during a sentence expansion drill" or "while reviewing the written homework".
        - Describe HOW ${studentName} actually did, not just what was covered. Use the student_performance field.
        - Add human warmth. This shouldn't read like a template. A small moment of genuine enthusiasm («this was a really solid session», «it was great to see», «one thing that stood out») goes a long way.
        - Where a recurring theme or weakness appears (e.g. article usage, tense errors), acknowledge the pattern explicitly and frame it as ongoing work.
        - British spelling and natural UK phrasing throughout.
        - No mention of AI, prompts, transcripts, or internal process.

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
                temperature: 0.45,
            }
        });

        return response.text;
    }
);
