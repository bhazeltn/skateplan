import React, { useState, useEffect } from 'react';
import { searchCompetitions, createSkaterEvent } from '@/lib/api';
import { Competition, EventType } from '@/lib/types/models';
import { X } from 'lucide-react';

export default function AddEventModal({ isOpen, onClose, onSuccess, skaterId }: any) {
  const [name, setName] = useState('');
  const [results, setResults] = useState<Competition[]>([]);
  const [formData, setFormData] = useState({
    event_type: 'COMPETITION' as EventType,
    start_date: '',
    end_date: '',
    is_peak_event: false
  });

  // Native "Fuzzy" search logic using datalist
  useEffect(() => {
    if (name.length > 2) {
      const delayDebounceFn = setTimeout(async () => {
        const data = await searchCompetitions(name);
        setResults(data);

        // Auto-fill if exact match found
        const exactMatch = data.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
          setFormData(prev => ({ ...prev, start_date: exactMatch.start_date, end_date: exactMatch.end_date }));
        }
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSkaterEvent(skaterId, { ...formData, name });
    onSuccess();
    onClose();
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Add Season Anchor</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Event Name</label>
            <input
              list="competition-results"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunsational 2026"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <datalist id="competition-results">
              {results.map(r => <option key={r.id} value={r.name} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
            Save Anchor
          </button>
        </form>
      </div>
    </div>
  );
}
