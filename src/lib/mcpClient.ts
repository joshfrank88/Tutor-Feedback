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

    // 2. Iterate docs until we find one with actual notes content (skips future/empty meetings)
    for (const doc of docs) {
        console.log(`Checking doc: ${doc.id} (${doc.title}), updated: ${doc.updated_at}`);

        const docResult = await client.callTool({
            name: "get_granola_document",
            arguments: { id: doc.id }
        }) as any;

        if (docResult.content?.[0]?.type === "text") {
            const raw = docResult.content[0].text;
            try {
                const parsed = JSON.parse(raw);
                const notes = parsed.markdown || parsed.content || '';
                // Only use this document if it has meaningful notes
                if (notes && notes.trim().length > 50) {
                    console.log(`✅ Found notes in: ${doc.title}`);
                    return {
                        title: parsed.title || doc.title,
                        notes,
                    };
                } else {
                    console.log(`⏭️  Skipping (no content): ${doc.title}`);
                }
            } catch {
                console.log(`⏭️  Skipping (parse error): ${doc.title}`);
            }
        }
    }

    throw new Error("Could not find any Granola document with notes. Please check that your session has been processed by Granola.");
}
