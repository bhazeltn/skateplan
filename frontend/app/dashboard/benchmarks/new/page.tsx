'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BenchmarkBuilderPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [metrics, setMetrics] = useState([{ label: '', data_type: 'NUMERIC', unit: '' }]);

  const addMetric = () => {
    setMetrics([...metrics, { label: '', data_type: 'NUMERIC', unit: '' }]);
  };

  const updateMetric = (index: number, field: string, value: string) => {
    const newMetrics = [...metrics];
    // @ts-ignore
    newMetrics[index][field] = value;
    setMetrics(newMetrics);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    
    try {
        const res = await fetch(`${api_url}/benchmarks/templates`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ name, metrics })
        });
        if (res.ok) {
            router.push('/dashboard/benchmarks');
        }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded shadow">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Benchmark Template</h1>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700">Template Name</label>
                <input 
                    name="templateName"
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 border rounded text-gray-900 bg-white"
                />
            </div>

            <div className="space-y-4 mb-6">
                <h3 className="font-medium text-gray-900">Metrics</h3>
                {metrics.map((m, i) => (
                    <div key={i} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500">Label</label>
                            <input 
                                placeholder="Metric Label"
                                value={m.label} onChange={e => updateMetric(i, 'label', e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded text-gray-900 bg-white"
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-xs text-gray-500">Type</label>
                            <select 
                                value={m.data_type} onChange={e => updateMetric(i, 'data_type', e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded text-gray-900 bg-white"
                            >
                                <option value="NUMERIC">Numeric</option>
                                <option value="TEXT">Text</option>
                                <option value="SCALE_1_10">1-10 Scale</option>
                            </select>
                        </div>
                        <div className="w-24">
                            <label className="block text-xs text-gray-500">Unit</label>
                            <input 
                                placeholder="Unit"
                                value={m.unit} onChange={e => updateMetric(i, 'unit', e.target.value)}
                                className="w-full mt-1 px-3 py-2 border rounded text-gray-900 bg-white"
                            />
                        </div>
                    </div>
                ))}
                <button onClick={addMetric} className="text-blue-600 text-sm font-medium hover:text-blue-800">
                    + Add Metric
                </button>
            </div>

            <button 
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium"
            >
                Save Template
            </button>
        </div>
    </div>
  );
}
