import React, { useEffect, useState } from 'react';
import { getSkaterEvents } from '@/lib/api';
import { SkaterEvent } from '@/lib/types/models';
import { Calendar } from 'lucide-react';

export const EventList = ({ skaterId }: { skaterId: string }) => {
  const [events, setEvents] = useState<SkaterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSkaterEvents(skaterId);
        setEvents(data);
      } catch (err) {
        console.error("Timeline load failed", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [skaterId]);

  if (loading) return <div className="p-4 animate-pulse text-slate-400">Loading timeline...</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">Season Anchors</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {events.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400 italic">No anchors set for this skater.</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-sm font-bold text-slate-900">{event.name || 'Competition'}</p>
                <p className="text-[11px] text-slate-500">{event.start_date} to {event.end_date}</p>
              </div>
              {event.is_peak_event && (
                <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Peak</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
