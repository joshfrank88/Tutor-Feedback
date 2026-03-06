import { z } from 'genkit';

const createEvidenceSchema = () => z.object({
    claim: z.string().describe("The specific feedback claim being made (e.g. 'Struggled with solving quadratic equations using the formula')"),
    evidence: z.string().describe("Timestamp like [12:34] or short exact snippet from the notes that proves this claim."),
    missing_info_flag: z.boolean().optional().describe("True if evidence could not be found to back up the claim"),
});

export const ExtractedTruthSchema = z.object({
    knowledge_reviewed: z.array(createEvidenceSchema()).describe("Topics/concepts that were reviewed from previous sessions."),
    new_knowledge: z.array(createEvidenceSchema()).describe("New concepts/topics introduced during this session."),
    strengths: z.array(createEvidenceSchema()).describe("What the student did well or showed strong understanding of."),
    areas_for_improvement: z.array(createEvidenceSchema()).describe("Struggles, misconceptions, or areas needing more work."),
    progress_made: z.string().optional().describe("Overall assessment of progress."),
    homework_assigned: z.string().optional().describe("Exactly what homework was assigned, if any."),
    next_lesson_preview: z.string().optional().describe("What will be covered in the next lesson."),
    tutor_private_notes: z.string().optional().describe("Private sensitive, mental health, or pastoral notes. MUST NOT be included in outputs."),
});

// Used for passing which platforms are requested
export const PlatformOptionsSchema = z.object({
    humanities: z.boolean(),
    intergreat: z.boolean(),
    privateTutee: z.boolean(),
    keystoneQuick: z.boolean(),
});
