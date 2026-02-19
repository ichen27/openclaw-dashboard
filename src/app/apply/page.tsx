'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, ExternalLink, ChevronRight, ChevronLeft,
  Plus, X, Check, AlertCircle, Trophy, Clock,
  Loader2, RefreshCw, Edit2, Save, Linkedin, Trash2,
  FileText, Search, Send, CheckSquare, Square
} from 'lucide-react';

// ─── Outreach Types ────────────────────────────────────────────────────────────
interface Outreach {
  id: string;
  company: string;
  contactName: string;
  contactRole: string;
  linkedinUrl: string;
  status: string;
  notes: string;
  sentAt: string;
  repliedAt: string | null;
}

const OUTREACH_STATUSES = [
  { id: 'pending',        label: 'Sent',           color: 'text-gray-400',    bg: 'bg-gray-500/10 border-gray-500/20' },
  { id: 'replied',        label: 'Replied',         color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'call_scheduled', label: 'Call Scheduled',  color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  { id: 'referred',       label: 'Referred! 🎉',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { id: 'no_response',    label: 'No Response',     color: 'text-muted-foreground', bg: 'bg-muted/30 border-border/20' },
  { id: 'declined',       label: 'Declined',        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
];

function OutreachSection() {
  const [outreach, setOutreach] = useState<Outreach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ company: '', contactName: '', contactRole: '', linkedinUrl: '', notes: '' });

  const fetchOutreach = useCallback(async () => {
    const res = await fetch('/api/outreach');
    setOutreach(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchOutreach(); }, [fetchOutreach]);

  const addOutreach = async () => {
    if (!form.company || !form.contactName) return;
    await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ company: '', contactName: '', contactRole: '', linkedinUrl: '', notes: '' });
    setShowAdd(false);
    fetchOutreach();
  };

  const updateStatus = async (id: string, status: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'replied') patch.repliedAt = new Date().toISOString();
    await fetch(`/api/outreach/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    fetchOutreach();
  };

  const deleteOutreach = async (id: string) => {
    await fetch(`/api/outreach/${id}`, { method: 'DELETE' });
    setOutreach(prev => prev.filter(o => o.id !== id));
  };

  const byStatus = OUTREACH_STATUSES.reduce((acc, s) => {
    acc[s.id] = outreach.filter(o => o.status === s.id);
    return acc;
  }, {} as Record<string, Outreach[]>);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">LinkedIn Outreach</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track messages to alumni, employees, and recruiters
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Log Outreach
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {['pending', 'replied', 'referred'].map(s => {
          const cfg = OUTREACH_STATUSES.find(x => x.id === s)!;
          return (
            <div key={s} className={`rounded-lg border p-3 ${cfg.bg}`}>
              <p className={`text-2xl font-bold ${cfg.color}`}>{byStatus[s]?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Add form modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h3 className="font-semibold">Log Outreach</h3>
              <button onClick={() => setShowAdd(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Company *</label>
                  <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                    placeholder="Two Sigma" autoFocus
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Contact Name *</label>
                  <input value={form.contactName} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Their Role</label>
                <input value={form.contactRole} onChange={e => setForm(f => ({ ...f, contactRole: e.target.value }))}
                  placeholder="e.g. SWE at Two Sigma (Syracuse alum)"
                  className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">LinkedIn URL</label>
                <input value={form.linkedinUrl} onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="e.g. Alumni from Syracuse CS, connected via LinkedIn alumni search"
                  className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              <button disabled={!form.company || !form.contactName} onClick={addOutreach}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outreach table */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : outreach.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/40 rounded-xl">
          <Linkedin className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No outreach logged yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Search LinkedIn for Syracuse alumni at your target companies
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium text-left">Contact</th>
                <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium text-left hidden md:table-cell">Company</th>
                <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium text-left">Status</th>
                <th className="px-4 py-2.5 text-xs text-muted-foreground font-medium text-left hidden sm:table-cell">Sent</th>
                <th className="px-4 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody>
              {outreach.map(o => {
                const statusCfg = OUTREACH_STATUSES.find(s => s.id === o.status) ?? OUTREACH_STATUSES[0];
                return (
                  <tr key={o.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20 group">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {o.linkedinUrl ? (
                          <a href={o.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <div className="h-3.5 w-3.5" />
                        )}
                        <div>
                          <p className="text-xs font-medium">{o.contactName}</p>
                          {o.contactRole && <p className="text-[10px] text-muted-foreground">{o.contactRole}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{o.company}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium bg-transparent cursor-pointer outline-none ${statusCfg.bg} ${statusCfg.color}`}
                      >
                        {OUTREACH_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-[10px] text-muted-foreground hidden sm:table-cell">
                      {new Date(o.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {o.repliedAt && <span className="text-emerald-500 ml-1">✓ replied</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => deleteOutreach(o.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tips */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-xs font-semibold text-blue-400 mb-2">💡 Outreach tips</p>
        <ul className="text-[10px] text-muted-foreground space-y-1">
          <li>• Search LinkedIn for &quot;[Company] Syracuse University&quot; to find alumni</li>
          <li>• Personalize each message — reference shared school/major</li>
          <li>• Keep messages short: intro + why their company + ask for 15 min chat</li>
          <li>• Templates at: ~/workspace/linkedin-outreach-templates.md</li>
        </ul>
      </div>
    </div>
  );
}

interface Application {
  id: string;
  company: string;
  role: string;
  url: string;
  stage: Stage;
  priority: string;
  notes: string;
  taskId: string | null;
  nextAction: string;
  appliedAt: string | null;
  interviewDate: string | null;
  offerDeadline: string | null;
  createdAt: string;
  updatedAt: string;
}

type Stage =
  | 'not_applied'
  | 'applied'
  | 'phone_screen'
  | 'technical'
  | 'final_round'
  | 'offer'
  | 'rejected'
  | 'withdrawn';

const STAGES: { id: Stage; label: string; color: string; bg: string; icon: string }[] = [
  { id: 'not_applied', label: 'Not Applied',   color: 'text-gray-500',   bg: 'bg-gray-500/10 border-gray-500/20',   icon: '📋' },
  { id: 'applied',     label: 'Applied',       color: 'text-blue-500',   bg: 'bg-blue-500/10 border-blue-500/20',   icon: '📤' },
  { id: 'phone_screen',label: 'Phone Screen',  color: 'text-cyan-500',   bg: 'bg-cyan-500/10 border-cyan-500/20',   icon: '📞' },
  { id: 'technical',   label: 'Technical',     color: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20',icon: '💻' },
  { id: 'final_round', label: 'Final Round',   color: 'text-amber-500',  bg: 'bg-amber-500/10 border-amber-500/20', icon: '🎯' },
  { id: 'offer',       label: 'Offer! 🎉',     color: 'text-emerald-500',bg: 'bg-emerald-500/10 border-emerald-500/20',icon: '🎉' },
  { id: 'rejected',    label: 'Rejected',      color: 'text-red-500',    bg: 'bg-red-500/10 border-red-500/20',     icon: '❌' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high:   'bg-red-500/20 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:    'bg-green-500/20 text-green-400 border-green-500/30',
};

function StageColumn({
  stage,
  apps,
  onAdvance,
  onReject,
  onEdit,
}: {
  stage: typeof STAGES[0];
  apps: Application[];
  onAdvance: (id: string, toStage: Stage) => void;
  onReject: (id: string) => void;
  onEdit: (app: Application) => void;
}) {
  const nextStage = STAGES.find((_, i) => STAGES[i - 1]?.id === stage.id);
  const prevStage = STAGES.find((_, i) => STAGES[i + 1]?.id === stage.id);

  return (
    <div className="flex-shrink-0 w-64">
      <div className={`rounded-lg border p-3 mb-3 ${stage.bg}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${stage.color}`}>
            {stage.icon} {stage.label}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{apps.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        {apps.map(app => (
          <div
            key={app.id}
            className="bg-card border border-border/50 rounded-lg p-3 hover:border-border transition-all group"
          >
            {/* Company + role */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">{app.company}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{app.role}</p>
              </div>
              <button
                onClick={() => onEdit(app)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Priority badge */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${PRIORITY_COLOR[app.priority] ?? ''}`}>
                {app.priority}
              </span>
              {app.appliedAt && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(app.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {app.interviewDate && (
                <span className="text-[10px] text-blue-400 flex items-center gap-0.5 font-medium">
                  📅 {new Date(app.interviewDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
              {app.url && (
                <a
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="ml-auto text-muted-foreground hover:text-blue-400 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Next action */}
            {app.nextAction && (
              <p className="text-[10px] text-muted-foreground/70 mt-1.5 leading-tight border-t border-border/30 pt-1.5">
                💡 {app.nextAction}
              </p>
            )}

            {/* Stage controls */}
            <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {prevStage && prevStage.id !== 'rejected' && (
                <button
                  onClick={() => onAdvance(app.id, prevStage.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border/50 hover:border-border rounded px-1.5 py-1 transition-colors"
                  title={`Move back to ${prevStage.label}`}
                >
                  <ChevronLeft className="h-2.5 w-2.5" />
                </button>
              )}
              {nextStage && (
                <button
                  onClick={() => onAdvance(app.id, nextStage.id)}
                  className="flex-1 flex items-center justify-center gap-1 text-[10px] text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 rounded px-1.5 py-1 transition-colors"
                  title={`Advance to ${nextStage.label}`}
                >
                  <ChevronRight className="h-2.5 w-2.5" />
                  {nextStage.label}
                </button>
              )}
              {stage.id !== 'rejected' && stage.id !== 'offer' && (
                <button
                  onClick={() => onReject(app.id)}
                  className="flex items-center justify-center text-[10px] text-red-500/60 hover:text-red-500 border border-red-500/20 hover:border-red-500/50 rounded px-1.5 py-1 transition-colors"
                  title="Mark as rejected"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {apps.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground/40 border border-dashed border-border/30 rounded-lg">
            Empty
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({
  app,
  onClose,
  onSave,
}: {
  app: Application;
  onClose: () => void;
  onSave: (id: string, data: Partial<Application>) => void;
}) {
  const [form, setForm] = useState({
    company: app.company,
    role: app.role,
    url: app.url,
    stage: app.stage,
    priority: app.priority,
    notes: app.notes,
    nextAction: app.nextAction,
    appliedAt: app.appliedAt ? app.appliedAt.split('T')[0] : '',
    interviewDate: app.interviewDate ? app.interviewDate.split('T')[0] : '',
    offerDeadline: app.offerDeadline ? app.offerDeadline.split('T')[0] : '',
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold">{form.company}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Company</label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Role</label>
              <input
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as Stage }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                {STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Applied Date</label>
              <input
                type="date"
                value={form.appliedAt}
                onChange={e => setForm(f => ({ ...f, appliedAt: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">📅 Interview Date</label>
              <input
                type="date"
                value={form.interviewDate}
                onChange={e => setForm(f => ({ ...f, interviewDate: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">⏰ Offer Deadline</label>
              <input
                type="date"
                value={form.offerDeadline}
                onChange={e => setForm(f => ({ ...f, offerDeadline: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Next Action</label>
            <input
              value={form.nextAction}
              onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))}
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              placeholder="e.g. Follow up by March 1"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50 resize-none"
              placeholder="Interview feedback, contacts, etc."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(app.id, {
                ...form,
                appliedAt: form.appliedAt || null,
                interviewDate: form.interviewDate || null,
                offerDeadline: form.offerDeadline || null,
              });
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function AddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Partial<Application>) => void;
}) {
  const [form, setForm] = useState({
    company: '',
    role: '',
    url: '',
    priority: 'high',
    nextAction: '',
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold">Add Application</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Company *</label>
            <input
              value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              placeholder="e.g. Jane Street"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Role *</label>
            <input
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              placeholder="e.g. Software Engineer Intern"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">URL</label>
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Next Action</label>
            <input
              value={form.nextAction}
              onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))}
              className="w-full bg-muted/50 border border-border/50 rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary/50"
              placeholder="e.g. Apply by Feb 28"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border/50">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            disabled={!form.company || !form.role}
            onClick={() => { onAdd(form); onClose(); }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Prep Checklist ───────────────────────────────────────────────────────────

const COVER_LETTERS_READY: Record<string, boolean> = {
  'Two Sigma': true,
  'Citadel Securities': true,
  'Akuna Capital': true,
  'HRT (Hudson River Trading)': true,
  'Bloomberg': true,
  'Cohere': true,
  'Stripe': true,
  'Palantir': true,
  'Robinhood': true,
  'Google': true,
  'Jane Street': true,
  'D.E. Shaw': true,
  'Optiver': true,
  'IMC Trading': true,
  'Jump Trading': true,
};

function PrepChecklistSection({ apps, onMarkApplied }: { apps: Application[]; onMarkApplied: (id: string) => Promise<void> }) {
  const [outreach, setOutreach] = useState<{ company: string }[]>([]);
  const [checks, setChecks] = useState<Record<string, { researched: boolean }>>(() => {
    try { return JSON.parse(localStorage.getItem('prep_checks') ?? '{}'); } catch { return {}; }
  });

  useEffect(() => {
    fetch('/api/outreach').then(r => r.json()).then(setOutreach).catch(() => {});
  }, []);

  const toggle = (company: string, field: 'researched') => {
    setChecks(prev => {
      const next = { ...prev, [company]: { ...prev[company], [field]: !prev[company]?.[field] } };
      try { localStorage.setItem('prep_checks', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const outreachSet = new Set(outreach.map(o => o.company));

  const rows = apps.map(app => ({
    company: app.company,
    role: app.role,
    clReady: COVER_LETTERS_READY[app.company] ?? false,
    researched: checks[app.company]?.researched ?? false,
    hasOutreach: outreachSet.has(app.company),
    applied: app.stage !== 'not_applied',
    stage: app.stage,
    priority: app.priority,
    appId: app.id,
  }));

  const readyCount = rows.filter(r => r.clReady && r.researched && r.applied).length;
  const clCount = rows.filter(r => r.clReady).length;

  const CheckCell = ({ on, onClick }: { on: boolean; onClick?: () => void }) => (
    onClick ? (
      <button onClick={onClick} className="flex justify-center w-full">
        {on
          ? <CheckSquare className="h-4 w-4 text-emerald-500" />
          : <Square className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
        }
      </button>
    ) : (
      <div className="flex justify-center">
        {on
          ? <Check className="h-4 w-4 text-emerald-500" />
          : <X className="h-4 w-4 text-muted-foreground/30" />
        }
      </div>
    )
  );

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cover letters ready', val: `${clCount} / ${rows.length}`, color: 'text-blue-400', icon: FileText },
          { label: 'Researched', val: `${rows.filter(r => r.researched).length} / ${rows.length}`, color: 'text-violet-400', icon: Search },
          { label: 'Fully submitted', val: `${readyCount} / ${rows.length}`, color: 'text-emerald-400', icon: Send },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} className="bg-card border border-border/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className={`text-lg font-bold ${color}`}>{val}</span>
            </div>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Company</th>
              <th className="px-3 py-3 text-xs text-muted-foreground font-medium text-center">
                <div className="flex items-center justify-center gap-1"><FileText className="h-3 w-3" /> CL</div>
              </th>
              <th className="px-3 py-3 text-xs text-muted-foreground font-medium text-center">
                <div className="flex items-center justify-center gap-1"><Search className="h-3 w-3" /> Researched</div>
              </th>
              <th className="px-3 py-3 text-xs text-muted-foreground font-medium text-center">
                <div className="flex items-center justify-center gap-1"><Linkedin className="h-3 w-3" /> Outreach</div>
              </th>
              <th className="px-3 py-3 text-xs text-muted-foreground font-medium text-center">
                <div className="flex items-center justify-center gap-1"><Send className="h-3 w-3" /> Applied</div>
              </th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => {
              const p = { high: 0, medium: 1, low: 2 };
              return (p[a.priority as keyof typeof p] ?? 2) - (p[b.priority as keyof typeof p] ?? 2);
            }).map((row, i) => (
              <tr key={row.company} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-sm">{row.company}</p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-48">{row.role}</p>
                </td>
                <td className="px-3 py-3"><CheckCell on={row.clReady} /></td>
                <td className="px-3 py-3"><CheckCell on={row.researched} onClick={() => toggle(row.company, 'researched')} /></td>
                <td className="px-3 py-3"><CheckCell on={row.hasOutreach} /></td>
                <td className="px-3 py-3"><CheckCell on={row.applied} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      row.stage === 'not_applied' ? 'text-muted-foreground bg-muted/30 border-border/30' :
                      row.stage === 'applied' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                      row.stage === 'offer' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                      row.stage === 'rejected' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                      'text-violet-400 bg-violet-500/10 border-violet-500/20'
                    }`}>
                      {row.stage.replace('_', ' ')}
                    </span>
                    {row.stage === 'not_applied' && (
                      <button
                        onClick={() => onMarkApplied(row.appId)}
                        className="text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
                        title="Mark as Applied"
                      >
                        ✓ Mark Applied
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        ✓ CL = cover letter written · Click 🔲 Researched to toggle · Outreach auto-detected from LinkedIn tab
      </p>
    </div>
  );
}

export default function ApplyPage() {
  const [tab, setTab] = useState<'pipeline' | 'outreach' | 'checklist'>('pipeline');
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApps(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const updateApp = useCallback(async (id: string, data: Partial<Application>) => {
    setSaving(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const updated = await res.json();
      setApps(prev => prev.map(a => a.id === id ? updated : a));
    } finally {
      setSaving(null);
    }
  }, []);

  const addApp = useCallback(async (data: Partial<Application>) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, stage: 'not_applied' }),
    });
    const created = await res.json();
    setApps(prev => [...prev, created]);
  }, []);

  const advanceStage = useCallback((id: string, toStage: Stage) => {
    const extra: Partial<Application> = {};
    if (toStage === 'applied') {
      extra.appliedAt = new Date().toISOString();
    }
    updateApp(id, { stage: toStage, ...extra });
  }, [updateApp]);

  const rejectApp = useCallback((id: string) => {
    updateApp(id, { stage: 'rejected' });
  }, [updateApp]);

  // Stats
  const activeApps = apps.filter(a => !['rejected', 'withdrawn'].includes(a.stage));
  const applied = apps.filter(a => a.stage !== 'not_applied' && a.stage !== 'rejected' && a.stage !== 'withdrawn');
  const offers = apps.filter(a => a.stage === 'offer');
  const inProgress = apps.filter(a => ['phone_screen', 'technical', 'final_round'].includes(a.stage));

  const displayStages = STAGES.filter(s => s.id !== 'withdrawn');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-amber-500" />
            Application Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Summer 2026 internship pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'pipeline' && (
            <>
              <button onClick={fetchApps} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> Add Company
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border/50">
        {[
          { id: 'pipeline', label: '📋 Pipeline' },
          { id: 'checklist', label: '✅ Prep Checklist' },
          { id: 'outreach', label: '💼 LinkedIn Outreach' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'pipeline' | 'outreach' | 'checklist')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Checklist tab */}
      {tab === 'checklist' && (
        <PrepChecklistSection
          apps={apps}
          onMarkApplied={async (id) => {
            await updateApp(id, { stage: 'applied', appliedAt: new Date().toISOString() });
          }}
        />
      )}

      {/* Outreach tab */}
      {tab === 'outreach' && <OutreachSection />}

      {/* Pipeline tab */}
      {tab === 'pipeline' && <>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Tracked', value: apps.length, icon: Briefcase, color: 'text-muted-foreground' },
          { label: 'Applied', value: applied.length, icon: Check, color: 'text-blue-500' },
          { label: 'In Progress', value: inProgress.length, icon: AlertCircle, color: 'text-amber-500' },
          { label: 'Offers', value: offers.length, icon: Trophy, color: 'text-emerald-500' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card border border-border/50 rounded-lg p-3 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline board */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${displayStages.length * 272}px` }}>
            {displayStages.map(stage => (
              <StageColumn
                key={stage.id}
                stage={stage}
                apps={apps.filter(a => a.stage === stage.id)}
                onAdvance={advanceStage}
                onReject={rejectApp}
                onEdit={setEditingApp}
              />
            ))}
          </div>
        </div>
      )}

      </> /* end pipeline tab */}

      {/* Modals */}
      {editingApp && (
        <EditModal
          app={editingApp}
          onClose={() => setEditingApp(null)}
          onSave={updateApp}
        />
      )}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdd={addApp}
        />
      )}

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 bg-card border border-border/50 rounded-lg px-3 py-2 text-xs text-muted-foreground shadow-lg">
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
