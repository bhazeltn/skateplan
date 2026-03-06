import React, { useState, useEffect } from 'react';
import { searchCompetitions, createSkaterEvent } from '@/lib/api';
import { Competition, EventType, SkaterEvent } from '@/lib/types/models';
import { X } from 'lucide-react';
import { Country, State, City } from 'country-state-city';

export default function AddEventModal({ isOpen, onClose, onSuccess, skaterId }: any) {
  const [name, setName] = useState('');
  const [results, setResults] = useState<Competition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    event_type: 'COMPETITION' as EventType,
    start_date: '',
    end_date: '',
    country: '',
    state_province: '',
    city: '',
    is_peak_event: false
  });

  const countries = Country.getAllCountries();
  const states = formData.country ? State.getStatesOfCountry(formData.country) : [];
  const cities = formData.state_province ? City.getCitiesOfState(formData.country, formData.state_province) : [];

  useEffect(() => {
    if (name.length > 2) {
      const delayDebounceFn = setTimeout(async () => {
        const data = await searchCompetitions(name);
        setResults(data);
        const exactMatch = data.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (exactMatch) {
          setFormData(prev => ({
            ...prev,
            start_date: exactMatch.start_date,
            end_date: exactMatch.end_date,
            country: exactMatch.country || '',
            state_province: exactMatch.state_province || '',
            city: exactMatch.city || ''
          }));
        }
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [name]);

  // Clear error when modal opens or user changes name
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  const handleNameChange = (value: string) => {
    setName(value);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Add Event</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await createSkaterEvent(skaterId, { name, ...formData } as Partial<SkaterEvent>);
            onSuccess();
            onClose();
          } catch (err: any) {
            // Parse status code from error message (format: "API request failed: 409 - Conflict")
            const statusCode = err?.message?.match(/\b(409)\b/);
            if (statusCode) {
              setError('This event already exists on this skater\'s calendar.');
            } else {
              setError('Failed to create event. Please check details and try again.');
            }
          }
        }} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label htmlFor="event-name" className="block text-sm font-semibold text-slate-700 mb-1">Event Name</label>
            <input
              id="event-name"
              list="competition-results"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
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
              onChange={(e) => setFormData({...formData, event_type: e.target.value as EventType})}
              className="w-full px-4 py-2 rounded-lg border border-slate-200"
            >
              <option value="COMPETITION">Competition</option>
              <option value="TEST_DAY">Test Day</option>
              <option value="SIMULATION">Simulation</option>
              <option value="CAMP">Camp/Seminar/Clinic</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
              <input id="start-date" type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200" required />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-semibold text-slate-700 mb-1">End Date</label>
              <input id="end-date" type="date" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-slate-200" required />
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
              <select id="country" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value, state_province: '', city: ''})} className="w-full px-4 py-2 rounded-lg border border-slate-200">
                <option value="">Select Country</option>
                {countries.map(c => <option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-slate-700 mb-1">State/Prov</label>
                <select id="state" value={formData.state_province} onChange={(e) => setFormData({...formData, state_province: e.target.value, city: ''})} disabled={!formData.country} className="w-full px-4 py-2 rounded-lg border border-slate-200 disabled:bg-slate-50">
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                <select id="city" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} disabled={!formData.state_province} className="w-full px-4 py-2 rounded-lg border border-slate-200 disabled:bg-slate-50">
                  <option value="">Select City</option>
                  {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm animate-in fade-in slide-in-from-top-1">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">Save Event</button>
        </form>
      </div>
    </div>
  );
}
