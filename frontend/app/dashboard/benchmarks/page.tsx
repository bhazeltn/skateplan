'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  created_at: string;
}

export default function BenchmarksPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchTemplates = async () => {
        const token = localStorage.getItem('token');
        const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        try {
            const res = await fetch(`${api_url}/benchmarks/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTemplates(await res.json());
            }
        } catch (e) { console.error(e); }
    };
    fetchTemplates();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Benchmarks</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between mb-6">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Templates</h1>
            <button 
                onClick={() => router.push('/dashboard/benchmarks/new')}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Create Template
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map(tmpl => (
                <div key={tmpl.id} className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900">{tmpl.name}</h3>
                </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
