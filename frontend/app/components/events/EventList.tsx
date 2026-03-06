"use client";

import React, { useEffect, useState } from 'react';
import { getSkaterEvents, deleteSkaterEvent } from '@/lib/api';
import { SkaterEvent } from '@/lib/types/models';
import { Calendar, Trash2, Edit2 } from 'lucide-react';

export const EventList = ({ skaterId, refreshKey }: { skaterId: string; refreshKey?: number }) => {
  const [events, setEvents] = useState<SkaterEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const data = await getSkaterEvents(skaterId);
      setEvents(data);
    } catch (err) {
      console.error("Events load failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [skaterId, refreshKey]);

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      await deleteSkaterEvent(skaterId, eventId);
      await loadEvents();
    } catch (err) {
      console.error("Failed to delete event", err);
    }
  };

  if (loading) return <div className="p-4 animate-pulse text-slate-400">Loading events...</div>;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-blue-600" />
        <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">Events</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {events.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400 italic">No events.</p>
        ) : (
          events.map(event => (
            <div key={event.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                    {event.event_type.replace('_', ' ')}
                  </span>
                  {event.is_peak_event && (
                    <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase shadow-sm">Peak</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900">{event.name}</p>
                <p className="text-[11px] text-slate-500">{event.start_date} to {event.end_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDelete(event.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Delete event"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};