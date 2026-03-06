'use client';

import { useState, useEffect } from 'react';
import type { StudentMetadata, PlatformRecord } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [presets, setPresets] = useState<Record<string, StudentMetadata> | null>(null);
    const [loading, setLoading] = useState(true);

    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        name: string,
        subject: string,
        rate: number,
        platforms: PlatformRecord
    } | null>(null);

    useEffect(() => {
        fetch('/api/presets')
            .then(res => res.json())
            .then(data => {
                setPresets(data);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        if (!presets || !formData || !formData.name.trim()) return;

        const updatedPresets = { ...presets };

        // If renaming, remove the old key
        if (editingKey && editingKey !== formData.name && editingKey !== 'General') {
            delete updatedPresets[editingKey];
        }

        updatedPresets[formData.name.trim()] = {
            subject: formData.subject,
            rate: formData.rate,
            platforms: formData.platforms
        };

        setLoading(true);
        const res = await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPresets),
        });

        if (res.ok) {
            const fresh = await res.json();
            setPresets(fresh.data);
            setEditingKey(null);
            setFormData(null);
        } else {
            alert('Failed to save settings');
        }
        setLoading(false);
    };

    const handleDelete = async (key: string) => {
        if (!presets) return;
        if (!confirm(`Are you sure you want to delete ${key}?`)) return;

        const updatedPresets = { ...presets };
        delete updatedPresets[key];

        setLoading(true);
        const res = await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPresets),
        });

        if (res.ok) {
            const fresh = await res.json();
            setPresets(fresh.data);
        }
        setLoading(false);
    };

    const startEdit = (key: string) => {
        setEditingKey(key);
        setFormData({
            name: key,
            subject: presets![key].subject,
            rate: presets![key].rate,
            platforms: { ...presets![key].platforms }
        });
    };

    const startAdd = () => {
        setEditingKey('');
        setFormData({
            name: '',
            subject: 'English',
            rate: 30,
            platforms: { intergreat: false, humanities: false, privateTutee: true, keystoneQuick: false }
        });
    };

    if (!presets) {
        return <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center"><p className="animate-pulse text-gray-500">Loading settings...</p></div>;
    }

    return (
        <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div>
                        <h1 className="text-3xl font-bold">Manage Students</h1>
                        <p className="text-gray-600 mt-1">Configure student profiles and platform routing.</p>
                    </div>
                    <Link href="/" className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md font-medium hover:bg-indigo-100 transition-colors">
                        &larr; Back to App
                    </Link>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* List Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold">Student Roster</h2>
                            <button
                                onClick={startAdd}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                            >
                                + Add Student
                            </button>
                        </div>

                        <div className="space-y-3">
                            {Object.entries(presets).map(([key, data]) => {
                                if (key === 'General') return null; // hide the General default from normal editing if we want, or handle it uniquely

                                const activePlatforms = Object.entries(data.platforms)
                                    .filter(([_, active]) => active)
                                    .map(([name]) => name.replace(/([A-Z])/g, ' $1').trim())
                                    .join(', ');

                                return (
                                    <div key={key} className="p-4 border border-gray-100 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors">
                                        <div>
                                            <h3 className="font-bold text-lg">{key}</h3>
                                            <p className="text-xs text-gray-500">{data.subject} | £{data.rate}/hr</p>
                                            <p className="text-xs text-indigo-600 mt-1">{activePlatforms || 'No platforms active'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(key)} className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">Edit</button>
                                            <button onClick={() => handleDelete(key)} className="px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded">Delete</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Edit/Add Form Section */}
                    {formData && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 ring-2 ring-indigo-50">
                            <h2 className="text-xl font-semibold mb-6">
                                {editingKey === '' ? 'Add New Student' : `Edit ${editingKey}`}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Student Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full border p-2 rounded-md bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. Thomas"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Subject</label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full border p-2 rounded-md bg-white"
                                            placeholder="e.g. English, Politics"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Hourly Rate (£)</label>
                                        <input
                                            type="number"
                                            value={formData.rate}
                                            onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                                            className="w-full border p-2 rounded-md bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="block text-sm font-medium mb-2">Target Platforms (Where does feedback go?)</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(formData.platforms).map(([k, active]) => {
                                            const key = k as keyof PlatformRecord;
                                            return (
                                                <label key={key} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={active}
                                                        onChange={e => setFormData({
                                                            ...formData,
                                                            platforms: { ...formData.platforms, [key]: e.target.checked }
                                                        })}
                                                        className="rounded text-blue-600"
                                                    />
                                                    <span className="capitalize text-sm">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end gap-3 border-t mt-4">
                                    <button
                                        onClick={() => { setFormData(null); setEditingKey(null); }}
                                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border rounded-md hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading || !formData.name.trim()}
                                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {loading ? 'Saving...' : 'Save Settings'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

