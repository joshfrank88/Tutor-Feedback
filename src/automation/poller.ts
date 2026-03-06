#!/usr/bin/env npx tsx
/**
 * Granola Polling Automation — Stage 7
 *
 * Polls Granola every 5 minutes for new meetings.
 * When a new meeting with content is found:
 *   1. Auto-detects the student from the title
 *   2. Generates feedback using the correct platform
 *   3. Saves locally + logs to Notion
 *   4. Sends a macOS desktop notification
 *
 * Usage: npm run automate
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadEnvConfig } from '@next/env';

// Load .env.local variables (required for standalone scripts)
loadEnvConfig(process.cwd());

import { getMcpClient } from '../lib/mcpClient';
import { detectStudentFromTitle, fetchDocumentNotes, runPipeline } from './pipeline';

// -- Config --
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const PROCESSED_FILE = path.join(process.cwd(), 'data', 'processed.json');

// -- Helpers --
function loadProcessed(): Set<string> {
    try {
        if (fs.existsSync(PROCESSED_FILE)) {
            const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf-8'));
            return new Set(data);
        }
    } catch { /* start fresh */ }
    return new Set();
}

function saveProcessed(ids: Set<string>) {
    const dir = path.dirname(PROCESSED_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify([...ids], null, 2));
}

function notify(title: string, message: string, linkUrl?: string) {
    // macOS native notification (pure osascript cannot make it clickable without a 3rd party package)
    const script = linkUrl
        ? `display notification "${message}" with title "${title}" subtitle "Check terminal for the Notion link"`
        : `display notification "${message}" with title "${title}"`;
    try {
        execSync(`osascript -e '${script}'`);
    } catch {
        console.log(`🔔 ${title}: ${message}`);
    }

    if (linkUrl) {
        log(`🔗 Link: ${linkUrl}`);
    }
}

function log(msg: string) {
    const ts = new Date().toLocaleTimeString('en-GB');
    console.log(`[${ts}] ${msg}`);
}

// -- Main Poll Loop --
async function poll() {
    const processed = loadProcessed();
    log(`Polling Granola (${processed.size} documents already processed)...`);

    let client;
    try {
        client = await getMcpClient();
    } catch (err) {
        log(`⚠️  Could not connect to Granola MCP. Will retry next cycle.`);
        return;
    }

    // List recent documents
    const listResult = await client.callTool({
        name: "list_granola_documents",
        arguments: { limit: 10 }
    }) as any;

    let docs: any[] = [];
    if (listResult.content?.[0]?.type === "text") {
        try {
            const parsed = JSON.parse(listResult.content[0].text);
            docs = parsed.documents || parsed;
        } catch {
            log('⚠️  Failed to parse document list');
            return;
        }
    }

    // Check for new, unprocessed documents
    // Special case: First ever run — we just save all current IDs as a baseline and do not process them
    if (processed.size === 0) {
        log('First ever run: Mapping current meetings as a baseline to prevent duplicate processing.');
        docs.forEach((d: any) => processed.add(d.id));
        saveProcessed(processed);
        return;
    }

    const newDocs = docs.filter((d: any) => !processed.has(d.id));

    if (newDocs.length === 0) {
        log('No new documents found.');
        return;
    }

    log(`Found ${newDocs.length} new document(s). Checking for content...`);

    for (const doc of newDocs) {
        // Fetch the document content
        const result = await fetchDocumentNotes(client, doc.id);

        if (!result) {
            log(`⏭️  ${doc.title} — no content yet (scheduled/upcoming?). Will check again later.`);
            continue;
        }

        // Detect student
        const studentName = detectStudentFromTitle(result.title);

        if (!studentName) {
            log(`⚠️  ${result.title} — could not identify student. Please process manually.`);
            notify('Tutor Feedback', `New session "${result.title}" needs manual processing — student not recognised.`);
            processed.add(doc.id);
            saveProcessed(processed);
            continue;
        }

        log(`🎓 Processing: ${result.title} → Student: ${studentName}`);

        try {
            const pipelineResult = await runPipeline(result.notes, studentName);

            log(`✅ Done! Feedback saved to: ${pipelineResult.savedPath}`);
            if (pipelineResult.notionId) {
                log(`📝 Logged to Notion: ${pipelineResult.notionId}`);
            }

            notify(
                `Feedback Ready: ${studentName}`,
                `${pipelineResult.platforms.join(', ')} feedback generated and saved.`,
                pipelineResult.notionUrl || pipelineResult.savedPath
            );

            processed.add(doc.id);
            saveProcessed(processed);

        } catch (err: any) {
            log(`❌ Pipeline error for ${result.title}: ${err.message}`);
            notify('Tutor Feedback Error', `Failed to process ${result.title}: ${err.message}`);
        }
    }
}

// -- Entry Point --
async function main() {
    log('🚀 Tutor Feedback Automation started');
    log(`   Polling every ${POLL_INTERVAL_MS / 1000 / 60} minutes`);
    log(`   Processed IDs stored in: ${PROCESSED_FILE}`);
    log('');

    // Run immediately on start
    await poll();

    // Then every 5 minutes
    setInterval(async () => {
        try {
            await poll();
        } catch (err: any) {
            log(`❌ Unexpected error: ${err.message}`);
        }
    }, POLL_INTERVAL_MS);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
