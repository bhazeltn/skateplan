'use client';

import { useState } from 'react';

interface GapAnalysisEntry {
  id: string;
  metric_id: string;
  metric_name: string;
  metric_category: string;
  metric_data_type: string;
  metric_unit: string | null;
  current_value: string;
  target_value: string;
  gap_value: string;
  gap_percentage: number;
  status: 'on_target' | 'close' | 'needs_work';
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GapEntryCardProps {
  entry: GapAnalysisEntry;
  editMode?: boolean;
  onUpdate: (id: string, data: any) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}

export default function GapEntryCard({ entry, editMode, onUpdate, onArchive }: GapEntryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(entry.current_value);
  const [targetValue, setTargetValue] = useState(entry.target_value);
  const [notes, setNotes] = useState(entry.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(entry.id, {
        current_value: currentValue,
        target_value: targetValue,
        notes: notes
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save entry:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(entry.current_value);
    setTargetValue(entry.target_value);
    setNotes(entry.notes || '');
    setIsEditing(false);
  };

  const progressPercent = Math.min(
    ((parseFloat(entry.current_value) / parseFloat(entry.target_value)) * 100),
    100
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_target':
        return '🟢';
      case 'close':
        return '🟡';
      case 'needs_work':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_target':
        return 'bg-green-500';
      case 'close':
        return 'bg-yellow-500';
      case 'needs_work':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-card rounded-lg shadow p-4 border border-border">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-foreground">{entry.metric_name}</h4>
            <span className="text-2xl">{getStatusIcon(entry.status)}</span>
          </div>

          {!isEditing ? (
            <>
              <div className="text-sm text-muted-foreground mb-2">
                <span className="font-medium">Current:</span> {entry.current_value} {entry.metric_unit || ''}
                {' | '}
                <span className="font-medium">Target:</span> {entry.target_value} {entry.metric_unit || ''}
                {' | '}
                <span className="font-medium">Gap:</span> {entry.gap_value} {entry.metric_unit || ''} ({entry.gap_percentage.toFixed(1)}%)
              </div>

              {/* Progress bar */}
              <div className="mb-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getStatusColor(entry.status)}`}
                    style={{ width: `${progressPercent.toFixed(1)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {progressPercent.toFixed(1)}% of target
                </div>
              </div>

              {entry.notes && (
                <div className="text-sm text-muted-foreground italic mt-2 p-2 bg-secondary rounded">
                  <span className="font-medium">Notes:</span> {entry.notes}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Current Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Target Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  placeholder="Add notes about progress..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-3 py-1 border border-border text-foreground text-sm rounded hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!isEditing && editMode && (
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
              title="Edit"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (confirm('Archive this metric? It will no longer appear in the gap analysis.')) {
                  onArchive(entry.id);
                }
              }}
              className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
              title="Archive"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
