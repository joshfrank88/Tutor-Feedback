import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Keep a singleton client across active requests if possible
let mcpClient: Client | null = null;

export async function getMcpClient() {
    if (mcpClient) return mcpClient;

    const command = process.env.GRANOLA_MCP_COMMAND || "npx";
    const args = process.env.GRANOLA_MCP_ARGS ? process.env.GRANOLA_MCP_ARGS.split(',') : ["-y", "spoon-cli@latest", "mcp"];

    console.log(`Starting MCP server: ${command} ${args.join(" ")}`);

    const transport = new StdioClientTransport({
        command: command,
        args: args,
    });

    mcpClient = new Client(
        {
            name: "feedback-generator-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        }
    );

    // This handles communication closing/error gracefully later
    transport.onerror = (error) => console.error("MCP Transport Error:", error);
    transport.onclose = () => {
        console.log("MCP Transport Closed");
        mcpClient = null;
    }

    try {
        await mcpClient.connect(transport);
        console.log("Connected to local Granola MCP provider!");
    } catch (err) {
        console.error("Failed to connect to MCP:", err);
        throw err;
    }

    return mcpClient;
}

/**
 * Fetch the raw utterance transcript for a document and condense it into
 * readable prose grouped by speaker ("Tutor:" vs "Student:").
 * Returns null if no transcript is available.
 */
async function fetchTranscriptText(client: Client, docId: string): Promise<string | null> {
    try {
        const res = await client.callTool({
            name: "get_granola_raw_transcript",
            arguments: { document_id: docId }
        }) as any;

        if (res.content?.[0]?.type !== "text") return null;
        const parsed = JSON.parse(res.content[0].text);
        if (parsed.error || !parsed.utterances?.length) return null;

        // Condense utterances: merge consecutive same-source chunks, label speakers
        const utterances: { source: string; text: string }[] = parsed.utterances;
        const lines: string[] = [];
        let currentSource = '';
        let currentChunks: string[] = [];

        for (const u of utterances) {
            const speaker = u.source === 'microphone' ? 'Tutor' : 'Student';
            if (speaker !== currentSource) {
                if (currentChunks.length) {
                    lines.push(`${currentSource}: ${currentChunks.join(' ')}`);
                }
                currentSource = speaker;
                currentChunks = [u.text.trim()];
            } else {
                currentChunks.push(u.text.trim());
            }
        }
        if (currentChunks.length) {
            lines.push(`${currentSource}: ${currentChunks.join(' ')}`);
        }

        return lines.join('\n');
    } catch {
        return null;
    }
}

/**
 * Fetch both the AI summary (markdown) and the raw transcript for a document,
 * returning them combined so Gemini has the richest possible context.
 */
export async function fetchDocumentWithTranscript(
    client: Client,
    docId: string
): Promise<{ title: string; notes: string } | null> {
    // 1. Fetch AI summary
    const docResult = await client.callTool({
        name: "get_granola_document",
        arguments: { id: docId }
    }) as any;

    if (docResult.content?.[0]?.type !== "text") return null;

    let summary = '';
    let title = 'Unknown';
    try {
        const parsed = JSON.parse(docResult.content[0].text);
        summary = parsed.markdown || parsed.content || '';
        title = parsed.title || 'Unknown';
    } catch {
        return null;
    }

    if (!summary || summary.trim().length < 50) return null;

    // 2. Fetch raw transcript (best effort — doesn't block if unavailable)
    const transcript = await fetchTranscriptText(client, docId);

    // 3. Combine: summary first (structured), then transcript (verbatim evidence)
    let combined = `## Granola AI Summary\n\n${summary}`;
    if (transcript) {
        combined += `\n\n---\n\n## Verbatim Transcript\n\n${transcript}`;
    }

    console.log(`✅ Fetched: ${title} — summary: ${summary.length} chars${transcript ? `, transcript: ${transcript.length} chars` : ', no transcript'}`);

    return { title, notes: combined };
}

export async function fetchLatestGranolaNotes() {
    const client = await getMcpClient();

    // 1. List recent documents
    const listResult = await client.callTool({
        name: "list_granola_documents",
        arguments: { limit: 10 }
    }) as any;

    let docs: any[] = [];
    if (listResult.content?.[0]?.type === "text") {
        try {
            const parsed = JSON.parse(listResult.content[0].text);
            docs = parsed.documents || parsed;
        } catch (e) {
            console.warn("Could not parse list_granola_documents JSON:", e);
        }
    }

    if (!docs.length) {
        throw new Error("No Granola documents found.");
    }

    // Sort by updated_at descending — most recently modified first
    docs.sort((a: any, b: any) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    // 2. Iterate docs until we find one with actual notes content
    for (const doc of docs) {
        console.log(`Checking doc: ${doc.id} (${doc.title}), updated: ${doc.updated_at}`);
        const result = await fetchDocumentWithTranscript(client, doc.id);
        if (result) return result;
        console.log(`⏭️  Skipping (no content): ${doc.title}`);
    }

    throw new Error("Could not find any Granola document with notes. Please check that your session has been processed by Granola.");
}
