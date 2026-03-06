import fs from 'fs';
import path from 'path';
import type { StudentMetadata } from './types';

export const DEFAULT_PRESETS: Record<string, StudentMetadata> = {
    Andy: {
        platforms: { intergreat: true, humanities: false, privateTutee: false, keystoneQuick: false },
        subject: "English",
        rate: 60
    },
    Phogo: {
        platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false },
        subject: "English",
        rate: 30
    },
    Chiara: {
        platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false },
        subject: "Politics",
        rate: 30
    },
    William: {
        platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false },
        subject: "Politics",
        rate: 30
    },
    Eleanor: {
        platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false },
        subject: "Politics",
        rate: 30
    },
    Sasha: {
        platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false },
        subject: "Politics",
        rate: 30
    },
    Oli: {
        platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false },
        subject: "Politics",
        rate: 30
    },
    General: {
        platforms: { humanities: true, privateTutee: false, intergreat: false, keystoneQuick: false },
        subject: "English",
        rate: 0
    }
};

const DATA_PATH = path.join(process.cwd(), 'data', 'presets.json');

export function getPresets(): Record<string, StudentMetadata> {
    if (fs.existsSync(DATA_PATH)) {
        try {
            return JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
        } catch (e) {
            console.error('Failed to parse presets.json', e);
        }
    }
    return { ...DEFAULT_PRESETS };
}

export function savePresets(data: Record<string, StudentMetadata>) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}
