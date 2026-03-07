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
        You are an expert educational analyst extracting structured facts from a tutoring session.
        The session is with a student named ${studentName}.

        INPUT STRUCTURE:
        The notes may contain:
        1. "Granola AI Summary" — a high-level structured overview.
        2. "Verbatim Transcript" — word-for-word conversation, labelled "Tutor:" or "Student:".
        Use BOTH. The transcript is richer and should be your primary evidence source.

        YOUR JOB:
        Populate the output schema as richly as possible. The more detail you extract, the better the final feedback will be.

        FOR EACH ITEM in knowledge_reviewed, new_knowledge, strengths, areas_for_improvement — populate ALL fields:

        "claim": What happened or was observed. Be SPECIFIC: name the exact topic, word, grammar rule, or skill.
          Good: "Practised expanding simple sentences using who/what/where/when/why/how framework"
          Bad: "Worked on writing"

        "exercise_type": What type of activity was this?
          Examples: written homework review, sentence expansion drill, reading aloud, vocabulary introduction,
          conversation practice, story-telling, grammar correction exercise, Q&A oral practice, etc.
          Be precise about what form the activity took.

        "student_performance": HOW DID THE STUDENT DO in this activity? This is crucial.
          Describe their actual performance — what came naturally, where they hesitated, what needed prompting,
          what errors they made, what they self-corrected, what the tutor had to correct. Use specific moments.
          Good: "Produced 'I watched a film with my father at the Imax cinema after dinner' — showed strong ability
                 to add detail when prompted, though needed nudging to include time/reason clauses"
          Bad: "Did well"

        "evidence": A short direct quote from the transcript or a specific note reference proving the claim.

        ADDITIONAL FIELDS:
        "overall_session_feel": Write 2-3 sentences capturing the vibe and energy of the session.
          How engaged was the student? Did anything surprise or impress? Was there a moment of breakthrough?
          This should feel like something you'd say to a colleague, not a report. Conversational.

        STRICT RULES:
        - Do NOT guess or hallucinate. Every claim needs evidence.
        - Private, sensitive, or pastoral notes go ONLY in 'tutor_private_notes'.
        - DO NOT extract the student's self-evaluations as facts unless confirmed by the tutor.

        Session Notes:
        ---
        ${rawText}
        ---
      `,
            output: { schema: ExtractedTruthSchema },
            config: {
                temperature: 0.1,
            }
        });

        if (!response.output) {
            throw new Error('Failed to generate valid truth extraction.');
        }

        return response.output;
    }
);
