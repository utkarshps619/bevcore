import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useUserOutlets } from '../hooks/useOutlets';
import type { ShiftNote } from '../types';
import { FileText, Plus, Calendar, Clock, Users, X, AlertCircle, CreditCard as Edit2, Trash2 } from 'lucide-react';

const shiftTypes = ['morning', 'afternoon', 'evening', 'night'] as const;

interface ShiftNoteModalProps {
  note: ShiftNote | null;
  outlets: { id: string; name: string }[];
  onSave: (data: Partial<ShiftNote>) => Promise<void>;
  onClose: () => void;
}

function ShiftNoteModal({ note, outlets, onSave, onClose }: ShiftNoteModalProps) {
  const [formData, setFormData] = useState({
    outlet_id: note?.outlet_id || outlets[0]?.id || '',
    shift_date: note?.shift_date || new Date().toISOString().split('T')[0],
    shift_type: note?.shift_type || 'evening',
    staff_notes: note?.staff_notes || '',
    service_summary: note?.service_summary || '',
    incidents: note?.incidents || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  const shiftTypeColors: Record<string, string> = {
    morning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    afternoon: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    evening: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    night: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl luxury-card max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {note ? 'Edit Shift Report' : 'Create Shift Report'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {outlets.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Outlet</label>
              <select
                value={formData.outlet_id}
                onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                className="luxury-input"
              >
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Shift Date</label>
              <input
                type="date"
                value={formData.shift_date}
                onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                className="luxury-input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Shift Type</label>
              <div className="grid grid-cols-2 gap-2">
                {shiftTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, shift_type: type })}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium capitalize transition-all ${
                      formData.shift_type === type
                        ? shiftTypeColors[type]
                        : 'text-zinc-400 bg-[#1a1a1d] hover:bg-[#1e1e21]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Service Summary
              </div>
            </label>
            <textarea
              value={formData.service_summary}
              onChange={(e) => setFormData({ ...formData, service_summary: e.target.value })}
              className="luxury-input min-h-[100px] resize-y"
              placeholder="Describe the shift service highlights, customer flow, peak hours..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Staff Notes
              </div>
            </label>
            <textarea
              value={formData.staff_notes}
              onChange={(e) => setFormData({ ...formData, staff_notes: e.target.value })}
              className="luxury-input min-h-[100px] resize-y"
              placeholder="Staff attendance, breaks, performance notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Incident Log
              </div>
            </label>
            <textarea
              value={formData.incidents}
              onChange={(e) => setFormData({ ...formData, incidents: e.target.value })}
              className="luxury-input min-h-[80px] resize-y"
              placeholder="Document any incidents, issues, or special occurrences..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="luxury-button-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="luxury-button">
              {loading ? 'Saving...' : note ? 'Update Report' : 'Create Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ShiftNotesPage() {
  const { user } = useAuth();
  const { outlets } = useUserOutlets();
  const [shiftNotes, setShiftNotes] = useState<(ShiftNote & { outlets?: { name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [modalNote, setModalNote] = useState<ShiftNote | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const fetchShiftNotes = useCallback(async () => {
    if (outlets.length === 0) {
      setShiftNotes([]);
      setLoading(false);
      return;
    }

    const outletIds = outlets.map((o) => o.id);
    const { data, error } = await supabase
      .from('shift_notes')
      .select('*, outlets(name)')
      .in('outlet_id', outletIds)
      .order('shift_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShiftNotes(data);
    }
    setLoading(false);
  }, [outlets]);

  useEffect(() => {
    fetchShiftNotes();
  }, [fetchShiftNotes]);

  const handleSave = async (data: Partial<ShiftNote>) => {
    if (modalNote) {
      const { error } = await supabase
        .from('shift_notes')
        .update(data)
        .eq('id', modalNote.id);
      if (!error) {
        await fetchShiftNotes();
        setShowModal(false);
        setModalNote(null);
      }
    } else {
      const { error } = await supabase.from('shift_notes').insert({
        ...data,
        created_by: user?.id,
      });
      if (!error) {
        await fetchShiftNotes();
        setShowModal(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('shift_notes').delete().eq('id', id);
    if (!error) {
      await fetchShiftNotes();
      setShowDeleteConfirm(null);
    }
  };

  const filteredNotes =
    selectedOutlet === 'all'
      ? shiftNotes
      : shiftNotes.filter((n) => n.outlet_id === selectedOutlet);

  const shiftTypeColors: Record<string, string> = {
    morning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    afternoon: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
    evening: 'text-violet-400 bg-violet-400/10 border-violet-400/20',
    night: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Shift Notes</h1>
          <p className="text-zinc-400 mt-1">Document and track shift reports</p>
        </div>
        <button
          onClick={() => {
            setModalNote(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-5 w-5" />
          Create Report
        </button>
      </div>

      {/* Filters */}
      {outlets.length > 1 && (
        <div className="flex gap-3">
          <select
            value={selectedOutlet}
            onChange={(e) => setSelectedOutlet(e.target.value)}
            className="luxury-input w-auto min-w-[180px]"
          >
            <option value="all">All Outlets</option>
            {outlets.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Shift notes list */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const isExpanded = expandedNote === note.id;

            return (
              <div
                key={note.id}
                className="luxury-card hover:border-[#2e2e31] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm font-medium text-white">
                          {new Date(note.shift_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                          shiftTypeColors[note.shift_type]
                        }`}
                      >
                        {note.shift_type} shift
                      </span>
                      <span className="text-xs text-zinc-500">
                        {note.outlets?.name || 'Unknown Outlet'}
                      </span>
                    </div>

                    {note.service_summary && (
                      <div className="mb-4">
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                          Service Summary
                        </p>
                        <p
                          className={`text-sm text-zinc-300 ${
                            isExpanded ? '' : 'line-clamp-2'
                          }`}
                        >
                          {note.service_summary}
                        </p>
                      </div>
                    )}

                    {isExpanded && (
                      <div className="space-y-4 pt-4 border-t border-[#1e1e21]">
                        {note.staff_notes && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                              Staff Notes
                            </p>
                            <p className="text-sm text-zinc-300">{note.staff_notes}</p>
                          </div>
                        )}
                        {note.incidents && (
                          <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Incident Log
                            </p>
                            <p className="text-sm text-zinc-300">{note.incidents}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                    <button
                      onClick={() => {
                        setModalNote(note);
                        setShowModal(true);
                      }}
                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {showDeleteConfirm === note.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(note.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#1e1e21] flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="h-3 w-3" />
                  Created {new Date(note.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="luxury-card text-center py-16">
          <FileText className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Shift Reports</h3>
          <p className="text-zinc-400 mb-6">
            Create your first shift report to document service details and incidents.
          </p>
          <button
            onClick={() => {
              setModalNote(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Plus className="h-5 w-5" />
            Create Report
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ShiftNoteModal
          note={modalNote}
          outlets={outlets}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setModalNote(null);
          }}
        />
      )}
    </div>
  );
}
