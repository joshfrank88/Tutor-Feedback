'use client';

import { useState, useRef, useEffect } from 'react';
import type { PlatformRecord, StudentMetadata } from '@/lib/types';
import Link from 'next/link';

export default function Home() {
  const [presets, setPresets] = useState<Record<string, StudentMetadata> | null>(null);

  const [inputText, setInputText] = useState('');
  const [preset, setPreset] = useState<string>('General');
  const [studentName, setStudentName] = useState('');
  const [platforms, setPlatforms] = useState<PlatformRecord>({
    intergreat: false, humanities: false, privateTutee: false, keystoneQuick: false
  });

  const [loading, setLoading] = useState(false);
  const [isFetchingGranola, setIsFetchingGranola] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/presets')
      .then(res => res.json())
      .then((data: Record<string, StudentMetadata>) => {
        setPresets(data);
        if (data['General']) {
          setPlatforms(data['General'].platforms);
        }
      })
      .catch(err => console.error("Failed to load presets", err));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  if (!presets) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 text-gray-900 flex items-center justify-center">
        <p className="text-gray-500 animate-pulse">Loading presets...</p>
      </main>
    );
  }

  const PRESET_NAMES = Object.keys(presets);

  const handleFetchGranola = async () => {
    setIsFetchingGranola(true);
    try {
      const res = await fetch('/api/granola');
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setInputText(data.notes || '');

      if (data.title) {
        const titleWords = data.title.toLowerCase().split(/\s+/);
        const matchedPreset = PRESET_NAMES.find(name =>
          name !== 'General' && titleWords.includes(name.toLowerCase())
        );
        if (matchedPreset) {
          setPreset(matchedPreset);
          setStudentName(matchedPreset);
          setPlatforms(presets[matchedPreset].platforms);
          showToast(`✅ Auto-detected student: ${matchedPreset}`);
        }
      }

    } catch (e: any) {
      console.error(e);
      showToast('❌ Error fetching from Granola: ' + e.message);
    } finally {
      setIsFetchingGranola(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const extractRes = await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extractTruth',
          payload: { rawText: inputText, studentName },
        }),
      });
      const truth = await extractRes.json();

      if (!extractRes.ok) throw new Error(truth.error || 'Failed to extract truth');

      const newResults: Record<string, any> = {};

      for (const [platform, isSelected] of Object.entries(platforms)) {
        if (!isSelected) continue;

        const renderRes = await fetch('/api/genkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'renderFeedback',
            payload: { extractedTruth: truth, platform, studentName },
          }),
        });
        const resData = await renderRes.json();

        if (!renderRes.ok) throw new Error(resData.error || `Failed to render feedback for ${platform}`);

        newResults[platform] = resData;
      }

      setResults({ truth, printed: newResults });

      await fetch('/api/genkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveSession',
          payload: {
            studentName,
            rawText: inputText,
            truthData: truth,
            printedOutputs: Object.fromEntries(
              Object.entries(newResults).map(([k, v]) => [k, v.text])
            ),
            metadata: { ts: new Date().toISOString() }
          },
        }),
      });

      const firstPlatformText = Object.values(newResults)[0]?.text || '';
      if (firstPlatformText) {
        await fetch('/api/genkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'logToNotion',
            payload: { studentName, feedbackText: firstPlatformText },
          }),
        });
      }

      showToast('✅ Feedback generated and logged to Notion!');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      console.error(e);
      showToast('❌ Error: ' + (e.message || 'See console for details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-8 text-gray-900">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.startsWith('❌') ? 'bg-red-500' : 'bg-green-600'}`}>
          {toast}
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tutor Feedback Automation</h1>
            <p className="text-gray-600">Convert Granola notes to platform-specific feedback.</p>
          </div>
          <Link href="/settings" className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-sm font-medium transition-colors">
            Manage Students
          </Link>
        </header>

        <section className="bg-white p-6 rounded-xl shadow-sm space-y-4 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Student Preset</label>
              <select
                value={preset}
                onChange={(e) => {
                  const val = e.target.value;
                  setPreset(val);
                  if (presets[val]) {
                    setPlatforms(presets[val].platforms);
                    if (val !== 'General') setStudentName(val);
                  }
                }}
                className="w-full border p-2 rounded-md bg-white"
              >
                {PRESET_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Student Name (Override)</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full border p-2 rounded-md bg-white"
                placeholder="e.g. Andy"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">Granola Notes</label>
              <button
                onClick={handleFetchGranola}
                disabled={isFetchingGranola}
                className="text-sm bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md border border-indigo-200 transition-colors disabled:opacity-50"
              >
                {isFetchingGranola ? 'Fetching...' : 'Fetch Latest from Granola'}
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full border p-2 rounded-md h-40 bg-white font-sans text-sm"
              placeholder="Paste or fetch Granola notes here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Target Platforms</label>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(platforms).map(([key, value]) => {
                const k = key as keyof PlatformRecord;
                return (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => setPlatforms({ ...platforms, [k]: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !inputText || !studentName}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing...' : 'Generate Feedback'}
          </button>
        </section>

        {results && (
          <section className="space-y-6" ref={resultsRef}>
            <h2 className="text-2xl font-semibold">Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(results.printed).map(([platform, data]: [string, any]) => (
                <div key={platform} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold capitalize text-lg flex items-center gap-2">
                      {platform.replace(/([A-Z])/g, ' $1')}
                      {data?.errors && data.errors.length > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Validation Failed</span>}
                    </h3>
                    <button onClick={() => navigator.clipboard.writeText(data?.text || '')} className="text-sm text-blue-600 hover:text-blue-800">Copy</button>
                  </div>
                  {data?.errors && data.errors.length > 0 && (
                    <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                      <strong>Remaining Errors:</strong>
                      <ul className="list-disc pl-4 mt-1">
                        {data.errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans border p-3 rounded bg-gray-50 flex-grow">
                    {data?.text || 'No text generated.'}
                  </pre>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 text-slate-300 p-4 rounded-xl overflow-auto max-h-96">
              <h3 className="font-semibold mb-2 text-white">Truth JSON (Debug)</h3>
              <pre className="text-xs">{JSON.stringify(results.truth, null, 2)}</pre>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
