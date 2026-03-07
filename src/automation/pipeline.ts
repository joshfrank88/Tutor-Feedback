/**
 * Reusable automation pipeline — shared between the poller and the web UI.
 * Runs: fetchNotes → detectStudent → extractTruth → renderFeedback → saveSession → logToNotion
 */
import { fetchLatestGranolaNotes, fetchDocumentWithTranscript, getMcpClient } from '../lib/mcpClient';
import { extractTruthFlow } from '../genkit/flows/extractTruth';
import { renderFeedbackFlow } from '../genkit/flows/renderFeedback';
import { validateAndFixFlow } from '../genkit/flows/validateAndFix';
import { validateFeedback } from '../lib/validator';
import { saveSession } from '../lib/storage';
import { logSessionToNotion } from '../lib/notion';
import { getPresets } from '../lib/presets';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

export interface PipelineResult {
    studentName: string;
    platforms: string[];
    feedbackTexts: Record<string, string>;
    savedPath: string;
    notionId?: string;
    notionUrl?: string;
}

/**
 * Detect which student preset matches a Granola meeting title.
 */
export function detectStudentFromTitle(title: string): string | null {
    const words = title.toLowerCase().split(/\s+/);
    const presets = getPresets();
    const names = Object.keys(presets);
    return names.find(name =>
        name !== 'General' && words.includes(name.toLowerCase())
    ) || null;
}

/**
 * Fetch Granola notes + transcript for a specific document ID.
 */
export async function fetchDocumentNotes(client: Client, docId: string): Promise<{ title: string; notes: string } | null> {
    return fetchDocumentWithTranscript(client, docId);
}

/**
 * Run the full feedback generation pipeline for a given set of notes + student.
 */
export async function runPipeline(
    notes: string,
    studentName: string,
): Promise<PipelineResult> {
    const presets = getPresets();
    const studentData = presets[studentName] || presets['General'];
    const platforms = studentData.platforms;

    console.log(`[Pipeline] Extracting truth for ${studentName}...`);
    const truth = await extractTruthFlow({ rawText: notes, studentName });

    // Generate feedback for each enabled platform
    const feedbackTexts: Record<string, string> = {};
    const activePlatforms: string[] = [];

    for (const [platform, isSelected] of Object.entries(platforms)) {
        if (!isSelected) continue;
        activePlatforms.push(platform);

        console.log(`[Pipeline] Rendering feedback for ${platform}...`);
        let draft = await renderFeedbackFlow({
            extractedTruth: truth,
            platform: platform as any,
            studentName,
        });

        // Validate and retry
        let errors = validateFeedback(draft, platform);
        let retries = 0;
        while (errors.length > 0 && retries < 2) {
            draft = await validateAndFixFlow({
                draftText: draft,
                platform: platform as any,
                validationErrors: errors,
            });
            errors = validateFeedback(draft, platform);
            retries++;
        }

        feedbackTexts[platform] = draft;
    }

    // Save locally
    console.log(`[Pipeline] Saving session locally...`);
    const savedPath = saveSession(
        studentName,
        notes,
        truth,
        feedbackTexts,
        { ts: new Date().toISOString(), automated: true }
    );

    // Log to Notion
    let notionId: string | undefined;
    let notionUrl: string | undefined;
    console.log(`[Pipeline] Logging to Notion...`);
    const firstFeedback = Object.values(feedbackTexts)[0] || '';
    if (firstFeedback) {
        const notionResult = await logSessionToNotion({
            studentName,
            feedbackText: firstFeedback,
        });
        notionId = notionResult?.id;
        notionUrl = (notionResult as any)?.url;
    }

    return {
        studentName,
        platforms: activePlatforms,
        feedbackTexts,
        savedPath,
        notionId,
        notionUrl,
    };
}
