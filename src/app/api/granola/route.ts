import { NextResponse } from 'next/server';
import { fetchLatestGranolaNotes } from '@/lib/mcpClient';

export async function GET() {
    try {
        console.log("Fetching latest Granola notes via MCP...");
        const result = await fetchLatestGranolaNotes();

        return NextResponse.json({
            ok: true,
            title: result.title,
            notes: result.notes
        });
    } catch (error: any) {
        console.error("Granola MCP Fetch Error:", error);
        return NextResponse.json(
            { ok: false, error: error.message || "Failed to fetch from Granola via MCP" },
            { status: 500 }
        );
    }
}
