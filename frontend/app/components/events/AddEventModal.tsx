import React, { useState, useEffect } from 'react';
import { searchCompetitions, createSkaterEvent } from '@/lib/api';
import { Competition, EventType, SkaterEvent } from '@/lib/types/models';
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

  useEffect(() => {
    if (name.length > 2) {
      const delayDebounceFn = setTimeout(async () => {
        const data = await searchCompetitions(name);
        setResults(data);
        const exactMatch = data.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
          setFormData(prev => ({ ...prev, start_date: exactMatch.start_date, end_date: exactMatch.end_date }));
        }
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [name]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Add Season Anchor</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          await createSkaterEvent(skaterId, { name, ...formData } as Partial<SkaterEvent>);
          onSuccess();
          onClose();
        }} className="p-6 space-y-4">
          <div>
            <label htmlFor="event-name" className="block text-sm font-semibold text-slate-700 mb-1">Event Name</label>
            <input
              id="event-name"
              list="competition-results"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunsational 2026"
              className="w-full px-4 py-2 rounded-lg border border-slate-200"
              required
            />
            <datalist id="competition-results">
              {results.map(r => <option key={r.id} value={r.name} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="event-type" className="block text-sm font-semibold text-slate-700 mb-1">Event Type</label>
            <select
              id="event-type"
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value as EventType })}
              className="w-full px-4 py-2 rounded-lg border border-slate-200"
            >
              <option value="COMPETITION">Competition</option>
              <option value="TEST_DAY">Test Day</option>
              <option value="SIMULATION">Simulation</option>
              <option value="CAMP">Camp</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
              <input id="start-date" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200" required />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
              <input id="end-date" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-slate-200" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">Save Anchor</button>
        </form>
      </div>
    </div>
  );
}