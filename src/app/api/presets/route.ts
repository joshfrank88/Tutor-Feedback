import { NextResponse } from 'next/server';
import { getPresets, savePresets } from '@/lib/presets';

export async function GET() {
    return NextResponse.json(getPresets());
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        savePresets(data);
        return NextResponse.json({ success: true, data: getPresets() });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
