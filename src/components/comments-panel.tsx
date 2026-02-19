'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Trash2, Loader2, Bot, User } from 'lucide-react';

interface Comment {
  id: string;
  taskId: string;
  author: string;
  content: string;
  mentions: string[];
  createdAt: string;
}

const AGENT_IDS = ['main', 'agent-2', 'agent-4', 'research-agent', 'qwen-worker', 'llama-8b'];

function isAgent(author: string): boolean {
  return AGENT_IDS.includes(author) || author.startsWith('agent-') || author === 'main';
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  const hr = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  return `${day}d ago`;
}

// Parse content and highlight @mentions
function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@[\w-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1);
      const isKnown = AGENT_IDS.includes(name);
      return (
        <span
          key={i}
          className={`font-medium ${isKnown ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function CommentsPanel({
  taskId,
  currentAuthor = 'human',
}: {
  taskId: string;
  currentAuthor?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authorOverride, setAuthorOverride] = useState(currentAuthor);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`);
      const data = await res.json() as Comment[];
      setComments(data);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const submit = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim(), author: authorOverride }),
      });
      if (res.ok) {
        const newComment = await res.json() as Comment;
        setComments(prev => [...prev, newComment]);
        setDraft('');
        textareaRef.current?.focus();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await fetch(`/api/tasks/${taskId}/comments?commentId=${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  };

  // @mention autocomplete hint
  const showMentionHint = draft.includes('@') && !draft.match(/@[\w-]{2,}/);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Comments</span>
        {comments.length > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0">{comments.length}</Badge>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-64 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Use @main, @agent-2 to notify agents
            </p>
          </div>
        ) : (
          comments.map(comment => {
            const agent = isAgent(comment.author);
            return (
              <div key={comment.id} className="group flex gap-2">
                {/* Avatar */}
                <div
                  className={`mt-0.5 flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${agent ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}
                >
                  {agent ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">{comment.author}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(comment.createdAt)}</span>
                    {comment.mentions.length > 0 && (
                      <div className="flex gap-0.5">
                        {comment.mentions.map(m => (
                          <span key={m} className="text-[9px] bg-primary/10 text-primary rounded px-1">
                            @{m}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                    {renderContent(comment.content)}
                  </p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => deleteComment(comment.id)}
                  disabled={deletingId === comment.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 text-muted-foreground/50 hover:text-red-500 disabled:opacity-30"
                >
                  {deletingId === comment.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Trash2 className="h-3 w-3" />
                  }
                </button>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Author selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground shrink-0">Posting as:</span>
        <select
          className="text-[10px] bg-muted border border-border/50 rounded px-1.5 py-0.5 text-foreground"
          value={authorOverride}
          onChange={e => setAuthorOverride(e.target.value)}
        >
          <option value="human">Ivan (human)</option>
          <option value="main">main (agent-1)</option>
          <option value="agent-2">agent-2</option>
          <option value="research-agent">research-agent</option>
        </select>
      </div>

      {/* Input */}
      <div className="space-y-1.5">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Add a comment… use @agent-2 to mention agents"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            className="resize-none text-xs pr-10"
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 h-6 w-6"
            onClick={submit}
            disabled={!draft.trim() || submitting}
          >
            {submitting
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Send className="h-3 w-3" />
            }
          </Button>
        </div>

        {showMentionHint && (
          <div className="flex gap-1 flex-wrap">
            {['@main', '@agent-2', '@agent-4', '@research-agent'].map(mention => (
              <button
                key={mention}
                className="text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 hover:bg-primary/20"
                onClick={() => {
                  const lastAt = draft.lastIndexOf('@');
                  setDraft(draft.slice(0, lastAt) + mention + ' ');
                  textareaRef.current?.focus();
                }}
              >
                {mention}
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60">⌘↵ to send</p>
      </div>
    </div>
  );
}
