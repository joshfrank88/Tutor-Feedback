import { Client } from "@notionhq/client";
import { getPresets } from "./presets";

const notion = new Client({
    auth: process.env.NOTION_TOKEN,
});

const databaseId = process.env.NOTION_DATABASE_ID;

export async function logSessionToNotion({
    studentName,
    feedbackText,
    date = new Date().toISOString(),
}: {
    studentName: string;
    feedbackText: string;
    date?: string;
}) {
    if (!databaseId) {
        console.warn("No NOTION_DATABASE_ID found in environment variables.");
        return;
    }

    const presets = getPresets();
    const studentData = presets[studentName] || presets["General"];

    try {
        const properties: any = {
            // "Homework?" is the Title property in this database
            "Homework?": {
                title: [
                    {
                        text: {
                            content: `Session with ${studentName}`,
                        },
                    },
                ],
            },
            // "Date & Time" (Date property)
            "Date & Time": {
                date: {
                    start: date.split("T")[0],
                },
            },
            // "Person" (Multi-select property containing student names)
            "Person": {
                multi_select: [
                    { name: studentName }
                ],
            },
            // "Lesson Type" (Multi-select property)
            "Lesson Type": {
                multi_select: [
                    { name: studentData.subject }
                ],
            },
            // "Amount Due (£)" (Number property)
            "Amount Due (£)": {
                number: studentData.rate,
            },
            // "Feedback" (Rich-text property)
            "Feedback": {
                rich_text: [
                    {
                        text: {
                            content: feedbackText.substring(0, 2000),
                        },
                    },
                ],
            },
            // "Paid?" (Checkbox property)
            "Paid?": {
                checkbox: false,
            }
        };

        const response = await notion.pages.create({
            parent: { database_id: databaseId },
            properties,
        });

        console.log("Successfully logged session to Notion:", response.id);
        return response;
    } catch (error: any) {
        console.error("Notion API Error Detail:", error.body || error.message);
        return null;
    }
}
