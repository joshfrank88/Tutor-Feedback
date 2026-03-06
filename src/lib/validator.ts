export function validateFeedback(text: string, platform: string): string[] {
    const errors: string[] = [];
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (platform === 'humanities') {
        if (words < 100 || words > 200) {
            errors.push(`Word count is ${words}, but must be between 100 and 200.`);
        }
        if (text.includes('\n\n') || text.match(/^[-*]/m)) {
            errors.push(`Must be a single paragraph with NO bullets or line breaks.`);
        }
    }

    if (platform === 'intergreat') {
        if (words < 50 || words > 140) {
            errors.push(`Word count is ${words}, but must be between 50 and 140.`);
        }

        const expectedHeadings = [
            '1. Knowledge reviewed',
            '2. New knowledge',
            '3. Areas for improvement',
            '4. Progress made',
            '5. Homework assigned',
            '6. Next lesson preview'
        ];

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let expectedIndex = 0;

        for (const heading of expectedHeadings) {
            // Find where this heading appears at the START of a line
            const foundIdx = lines.findIndex(l => l.startsWith(heading));

            if (foundIdx === -1) {
                errors.push(`Missing exact heading: "${heading}" at the start of a line.`);
            } else {
                if (foundIdx < expectedIndex) {
                    errors.push(`Heading "${heading}" is out of order.`);
                }
                expectedIndex = foundIdx;
            }
        }
    }

    if (platform === 'privateTutee') {
        if (words < 60 || words > 120) {
            errors.push(`Word count is ${words}, but must be between 60 and 120.`);
        }

        const requiredHeadings = ['Wins', 'Next steps', 'Homework'];
        for (const heading of requiredHeadings) {
            if (!new RegExp(`(^|\\n)#*\\s*${heading}`, 'i').test(text)) {
                errors.push(`Missing heading: "${heading}"`);
            }
        }

        // Try to count bullets per section
        const sections = text.split(/(?:^|\n)#*\s*(?:Wins|Next steps|Homework)/i);
        // Ignore the first split which is text before the first heading
        for (let i = 1; i < sections.length; i++) {
            const sectionText = sections[i];
            const bullets = sectionText.split('\n').filter(l => l.trim().match(/^[-*]\s/));
            if (bullets.length > 3) {
                errors.push('Exceeded max 3 bullets per section limit.');
                break; // only push once
            }
        }
    }

    if (platform === 'keystoneQuick') {
        if (words < 40 || words > 90) {
            errors.push(`Word count is ${words}, but must be between 40 and 90.`);
        }
    }

    return errors;
}
