import fs from 'fs';
import path from 'path';

export function saveSession(
    studentName: string,
    rawText: string,
    truthData: any,
    printedOutputs: Record<string, string>,
    metadata: any
) {
    // Format YYYY-MM-DD__Student__HHMMSS
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    const dirName = `${dateStr}__${studentName.replace(/[^a-zA-Z0-9]/g, '_')}__${timeStr}`;

    const basePath = path.join(process.cwd(), 'data', 'sessions', dirName);

    fs.mkdirSync(basePath, { recursive: true });

    fs.writeFileSync(path.join(basePath, 'input_raw.txt'), rawText);
    fs.writeFileSync(path.join(basePath, 'extracted.json'), JSON.stringify(truthData, null, 2));
    fs.writeFileSync(path.join(basePath, 'meta.json'), JSON.stringify(metadata, null, 2));

    for (const [platform, text] of Object.entries(printedOutputs)) {
        // Generate e.g. feedback_humanities.txt
        const filename = `feedback_${platform.replace(/([A-Z])/g, '_$1').toLowerCase()}.txt`;
        fs.writeFileSync(path.join(basePath, filename), text);
    }

    // Create machine-readable result summary
    fs.writeFileSync(path.join(basePath, 'result.json'), JSON.stringify({
        student: studentName,
        date: dateStr,
        outputs: Object.keys(printedOutputs),
    }, null, 2));

    return basePath;
}
