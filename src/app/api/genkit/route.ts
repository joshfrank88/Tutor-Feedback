import { extractTruthFlow } from '@/genkit/flows/extractTruth';
import { renderFeedbackFlow } from '@/genkit/flows/renderFeedback';
import { validateAndFixFlow } from '@/genkit/flows/validateAndFix';
import { validateFeedback } from '@/lib/validator';
import { saveSession } from '@/lib/storage';
import { logSessionToNotion } from '@/lib/notion';

export const POST = async (req: Request) => {
    try {
        const body = await req.json();
        const { action, payload } = body;

        if (action === 'extractTruth') {
            const result = await extractTruthFlow(payload);
            return Response.json(result);
        }

        if (action === 'renderFeedback') {
            let draft = await renderFeedbackFlow(payload);
            let errors = validateFeedback(draft, payload.platform);

            let retries = 0;
            while (errors.length > 0 && retries < 2) {
                console.log(`Validation failed for ${payload.platform}. Retrying... errors:`, errors);
                draft = await validateAndFixFlow({
                    draftText: draft,
                    platform: payload.platform,
                    validationErrors: errors,
                });
                errors = validateFeedback(draft, payload.platform);
                retries++;
            }

            return Response.json({ text: draft, errors, retries });
        }

        if (action === 'saveSession') {
            const { studentName, rawText, truthData, printedOutputs, metadata } = payload;
            const path = saveSession(studentName, rawText, truthData, printedOutputs, metadata);
            return Response.json({ success: true, path });
        }

        if (action === 'logToNotion') {
            const { studentName, feedbackText, date } = payload;
            const result = await logSessionToNotion({ studentName, feedbackText, date });
            return Response.json({ success: true, id: result?.id });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error: any) {
        console.error('Genkit API Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
};
