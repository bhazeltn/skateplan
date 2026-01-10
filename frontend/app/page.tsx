'use client';
import { useEffect, useState } from 'react';
import { fetchElements } from './lib/api';

export default function Dashboard() {
  const [elements, setElements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchElements().then((data) => {
      setElements(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">SkatePlan: Data Library</h1>
        
        {loading ? (
          <p>Loading Library...</p>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Element</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {elements.map((el: any) => (
                  <tr key={el.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-600">{el.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{el.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{el.base_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
