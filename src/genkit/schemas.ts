import { z } from 'genkit';

const createEvidenceSchema = () => z.object({
    claim: z.string().describe("The specific feedback claim being made (e.g. 'Struggled with article usage: said \"a elephant\" instead of \"an elephant\"')"),
    exercise_type: z.string().optional().describe("The type of exercise or activity that produced this (e.g. 'sentence expansion drill', 'reading aloud', 'vocabulary matching', 'written homework review', 'conversation practice')"),
    student_performance: z.string().optional().describe("How the student actually did in this specific exercise — successes, hesitations, corrections needed, improvements shown. Be concrete and descriptive, not just 'good' or 'struggled'."),
    evidence: z.string().describe("A short exact quote or specific moment from the transcript/notes that proves this claim."),
    missing_info_flag: z.boolean().optional().describe("True if evidence could not be found to back up the claim"),
});

export const ExtractedTruthSchema = z.object({
    knowledge_reviewed: z.array(createEvidenceSchema()).describe("Topics/concepts that were reviewed or practised from previous sessions, with the exercise or activity used."),
    new_knowledge: z.array(createEvidenceSchema()).describe("New concepts, vocabulary, grammar structures, or techniques introduced for the first time this session."),
    strengths: z.array(createEvidenceSchema()).describe("Specific moments where the student did well, showed improvement, or produced something impressive."),
    areas_for_improvement: z.array(createEvidenceSchema()).describe("Specific error patterns, misconceptions, or areas where the student still needs work — with the concrete mistake where possible."),
    overall_session_feel: z.string().optional().describe("A brief holistic sense of how the session went — the student's energy, engagement, attitude, overall progress. Conversational tone. Not for sensitive pastoral content."),
    progress_made: z.string().optional().describe("Summary of observable progress this session."),
    homework_assigned: z.string().optional().describe("Exactly what homework was assigned, if any."),
    next_lesson_preview: z.string().optional().describe("What will be covered in the next lesson."),
    tutor_private_notes: z.string().optional().describe("Private sensitive, mental health, or pastoral notes. MUST NOT be included in feedback outputs."),
});

// Used for passing which platforms are requested
export const PlatformOptionsSchema = z.object({
    humanities: z.boolean(),
    intergreat: z.boolean(),
    privateTutee: z.boolean(),
    keystoneQuick: z.boolean(),
});
