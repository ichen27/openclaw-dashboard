'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Pin, PinOff, Trash2, Send, RefreshCw,
  ChevronDown, ChevronUp, Edit2, Check, X, Loader2,
  AtSign, Megaphone, Activity, Hash, MoreHorizontal,
  Heart, Reply, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedPost {
  id: string;
  author: string;
  content: string;
  type: string;
  pinned: boolean;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
}

interface PostWithReplies extends FeedPost {
  replies?: FeedPost[];
  repliesLoaded?: boolean;
  repliesOpen?: boolean;
}

const AUTHORS = ['ivan', 'main', 'agent-1', 'agent-2', 'agent-3', 'agent-4'];
const TYPES = [
  { key: 'post', label: 'Post', icon: Hash },
  { key: 'request', label: 'Request', icon: Megaphone },
  { key: 'status', label: 'Status', icon: Activity },
];

const TYPE_CONFIG: Record<string, { bg: string; text: string; icon: typeof Hash }> = {
  post:    { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Hash },
  request: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Megaphone },
  status:  { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: Activity },
  comment: { bg: 'bg-muted/40', text: 'text-muted-foreground', icon: MessageCircle },
};

const AUTHOR_COLORS: Record<string, { bg: string; ring: string }> = {
  ivan:      { bg: 'bg-violet-500', ring: 'ring-violet-500/30' },
  main:      { bg: 'bg-blue-500', ring: 'ring-blue-500/30' },
  'agent-1': { bg: 'bg-cyan-500', ring: 'ring-cyan-500/30' },
  'agent-2': { bg: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  'agent-3': { bg: 'bg-amber-500', ring: 'ring-amber-500/30' },
  'agent-4': { bg: 'bg-rose-500', ring: 'ring-rose-500/30' },
};

function getAuthorStyle(author: string) {
  return AUTHOR_COLORS[author] ?? { bg: 'bg-slate-500', ring: 'ring-slate-500/30' };
}

function authorInitials(author: string) {
  if (author === 'ivan') return 'IV';
  if (author === 'main') return 'M';
  const parts = author.split('-');
  if (parts.length > 1) return parts[0][0].toUpperCase() + parts[1];
  return author.slice(0, 2).toUpperCase();
}

function authorDisplay(author: string) {
  if (author === 'ivan') return 'Ivan';
  if (author === 'main') return 'Main Agent';
  return author;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ author, size = 'md' }: { author: string; size?: 'sm' | 'md' }) {
  const style = getAuthorStyle(author);
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-xs';
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-bold text-white shrink-0 ring-2',
      style.bg, style.ring, sizeClass
    )}>
      {authorInitials(author)}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.comment;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium', config.bg, config.text)}>
      <Icon className="h-2.5 w-2.5" />
      {type}
    </span>
  );
}

/* ── Dropdown component (replaces native <select>) ── */
function Dropdown({ value, options, onChange, renderOption, className }: {
  value: string;
  options: { key: string; label: string; icon?: typeof Hash }[];
  onChange: (key: string) => void;
  renderOption?: (opt: { key: string; label: string; icon?: typeof Hash }, active: boolean) => React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.key === value) ?? options[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-muted/60 hover:bg-muted border border-border/40 hover:border-border/60 transition-all"
      >
        {current.icon && <current.icon className="h-3 w-3 text-muted-foreground" />}
        {current.label}
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-popover border border-border/60 rounded-lg shadow-xl shadow-black/10 py-1 animate-in fade-in-0 zoom-in-95 duration-100">
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-muted/80 transition-colors text-left',
                opt.key === value && 'bg-muted/50 font-medium'
              )}
            >
              {renderOption ? renderOption(opt, opt.key === value) : (
                <>
                  {opt.icon && <opt.icon className="h-3 w-3 text-muted-foreground" />}
                  {opt.label}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Author pill selector for compose ── */
function AuthorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Dropdown
      value={value}
      onChange={onChange}
      options={AUTHORS.map(a => ({ key: a, label: authorDisplay(a) }))}
      renderOption={(opt) => (
        <div className="flex items-center gap-2">
          <div className={cn('h-4 w-4 rounded-full', getAuthorStyle(opt.key).bg)} />
          <span>{opt.label}</span>
        </div>
      )}
    />
  );
}

/* ── Post Card ── */
function PostCard({
  post,
  onTogglePin,
  onDelete,
  onReply,
  onLoadReplies,
  isReply = false,
}: {
  post: PostWithReplies;
  onTogglePin: (id: string, pinned: boolean) => void;
  onDelete: (id: string) => void;
  onReply?: (parentId: string, content: string, author: string) => Promise<void>;
  onLoadReplies?: (id: string) => void;
  isReply?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyAuthor, setReplyAuthor] = useState('ivan');
  const [replyContent, setReplyContent] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setShowActions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveEdit = async () => {
    if (!editContent.trim()) return;
    setSaving(true);
    await fetch(`/api/feed/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    setSaving(false);
    setEditing(false);
    window.dispatchEvent(new CustomEvent('feed:refresh'));
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !onReply) return;
    setSendingReply(true);
    await onReply(post.id, replyContent.trim(), replyAuthor);
    setReplyContent('');
    setReplyOpen(false);
    setSendingReply(false);
  };

  return (
    <div className={cn(
      'group transition-all duration-200',
      isReply ? 'pl-4 border-l-2 border-border/30' : '',
    )}>
      <div className={cn(
        'rounded-2xl transition-all duration-200',
        isReply
          ? 'bg-muted/20 hover:bg-muted/30 p-3'
          : 'bg-card hover:bg-card/80 border border-border/40 hover:border-border/60 p-4',
        post.pinned && !isReply && 'ring-1 ring-amber-500/20 border-amber-500/30 bg-amber-500/[0.02]',
      )}>
        {/* Pinned indicator */}
        {post.pinned && !isReply && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium mb-2 -mt-0.5">
            <Pin className="h-2.5 w-2.5" />
            Pinned
          </div>
        )}

        {/* Post body */}
        <div className="flex gap-3">
          <Avatar author={post.author} size={isReply ? 'sm' : 'md'} />
          <div className="flex-1 min-w-0">
            {/* Author line */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold truncate">{authorDisplay(post.author)}</span>
              <span className="text-xs text-muted-foreground/60">@{post.author}</span>
              <span className="text-xs text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground/60">{timeAgo(post.createdAt)}</span>
              {!isReply && <TypeBadge type={post.type} />}
              {/* More actions */}
              <div ref={actionsRef} className="relative ml-auto">
                <button
                  onClick={() => setShowActions(s => !s)}
                  className="p-1 rounded-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60 transition-all opacity-0 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {showActions && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-36 bg-popover border border-border/60 rounded-xl shadow-xl shadow-black/10 py-1 animate-in fade-in-0 zoom-in-95 duration-100">
                    <button
                      onClick={() => { setEditing(true); setShowActions(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/80 transition-colors text-left"
                    >
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => { onTogglePin(post.id, !post.pinned); setShowActions(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/80 transition-colors text-left"
                    >
                      {post.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      {post.pinned ? 'Unpin' : 'Pin'}
                    </button>
                    <div className="my-1 border-t border-border/30" />
                    <button
                      onClick={() => { if (confirm('Delete this post?')) onDelete(post.id); setShowActions(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            {editing ? (
              <div className="space-y-2 mt-1">
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  className="w-full bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors font-medium"
                  >
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditContent(post.content); }}
                    className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>
            )}

            {/* Interaction bar */}
            {!isReply && !editing && (
              <div className="flex items-center gap-1 mt-3 -ml-2">
                <button
                  onClick={() => {
                    if (!post.repliesOpen && onLoadReplies) onLoadReplies(post.id);
                    else if (post.repliesOpen && onLoadReplies) onLoadReplies(post.id);
                    if (post.replyCount === 0 && !post.repliesOpen) setReplyOpen(r => !r);
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-full hover:bg-primary/10 transition-all"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.replyCount > 0 && <span>{post.replyCount}</span>}
                </button>
                <button
                  onClick={() => setReplyOpen(r => !r)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-blue-400 px-2 py-1.5 rounded-full hover:bg-blue-500/10 transition-all"
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Inline reply compose */}
        {!isReply && replyOpen && onReply && (
          <div className="mt-3 ml-[52px] flex gap-2 items-start">
            <Avatar author={replyAuthor} size="sm" />
            <div className="flex-1 space-y-2">
              <textarea
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendReply(); }}
                rows={2}
                placeholder="Write a reply..."
                className="w-full bg-muted/40 border border-border/40 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <AuthorPicker value={replyAuthor} onChange={setReplyAuthor} />
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => { setReplyOpen(false); setReplyContent(''); }}
                    className="text-xs px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={!replyContent.trim() || sendingReply}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 transition-all"
                  >
                    {sendingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Replies thread */}
      {!isReply && post.repliesOpen && (
        <div className="ml-6 mt-2 space-y-2">
          {(post.replies ?? []).map(reply => (
            <PostCard
              key={reply.id}
              post={reply as PostWithReplies}
              onTogglePin={onTogglePin}
              onDelete={onDelete}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Feed Page ── */
export default function FeedPage() {
  const [posts, setPosts] = useState<PostWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [composeAuthor, setComposeAuthor] = useState('ivan');
  const [composeContent, setComposeContent] = useState('');
  const [composeType, setComposeType] = useState('post');
  const [posting, setPosting] = useState(false);
  const [composeFocused, setComposeFocused] = useState(false);
  const composeRef = useRef<HTMLTextAreaElement>(null);

  const fetchPosts = useCallback(async (type: string, cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (type !== 'all') params.set('type', type);
    if (cursor) params.set('cursor', cursor);
    const res = await fetch(`/api/feed?${params}`);
    return await res.json() as { posts: PostWithReplies[]; hasMore: boolean; nextCursor: string | null };
  }, []);

  const loadPosts = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const data = await fetchPosts(type);
      setPosts(data.posts);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [fetchPosts]);

  useEffect(() => { loadPosts(filterType); }, [filterType, loadPosts]);

  useEffect(() => {
    const handler = () => loadPosts(filterType);
    window.addEventListener('feed:refresh', handler);
    return () => window.removeEventListener('feed:refresh', handler);
  }, [filterType, loadPosts]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetchPosts(filterType, nextCursor);
      setPosts(prev => [...prev, ...data.posts]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePost = async () => {
    if (!composeContent.trim()) return;
    setPosting(true);
    try {
      await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: composeAuthor, content: composeContent.trim(), type: composeType }),
      });
      setComposeContent('');
      setComposeFocused(false);
      await loadPosts(filterType);
    } finally {
      setPosting(false);
    }
  };

  const handleTogglePin = async (id: string, pinned: boolean) => {
    await fetch(`/api/feed/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    });
    await loadPosts(filterType);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/feed/${id}`, { method: 'DELETE' });
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleLoadReplies = async (id: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (p.repliesOpen) return { ...p, repliesOpen: false };
      return { ...p, repliesOpen: true };
    }));
    const post = posts.find(p => p.id === id);
    if (post && !post.repliesLoaded) {
      const res = await fetch(`/api/feed/${id}`);
      const data = await res.json();
      setPosts(prev => prev.map(p => {
        if (p.id !== id) return p;
        return { ...p, replies: data.replies, repliesLoaded: true, repliesOpen: true };
      }));
    }
  };

  const handleReply = async (parentId: string, content: string, author: string) => {
    await fetch('/api/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content, type: 'comment', parentId }),
    });
    const res = await fetch(`/api/feed/${parentId}`);
    const data = await res.json();
    setPosts(prev => prev.map(p => {
      if (p.id !== parentId) return p;
      return { ...p, replies: data.replies, repliesLoaded: true, replyCount: data.replies.length, repliesOpen: true };
    }));
  };

  const FILTER_TABS = [
    { key: 'all', label: 'All', icon: Sparkles },
    { key: 'post', label: 'Posts', icon: Hash },
    { key: 'request', label: 'Requests', icon: Megaphone },
    { key: 'status', label: 'Status', icon: Activity },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Feed</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Agent & human activity stream</p>
        </div>
        <button
          onClick={() => loadPosts(filterType)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-full transition-all active:scale-95"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Compose */}
      <div className={cn(
        'rounded-2xl border transition-all duration-200 mb-1',
        composeFocused
          ? 'bg-card border-primary/30 shadow-lg shadow-primary/5'
          : 'bg-card/60 border-border/40 hover:border-border/60',
      )}>
        <div className="flex gap-3 p-4">
          <Avatar author={composeAuthor} />
          <div className="flex-1 space-y-3">
            <textarea
              ref={composeRef}
              value={composeContent}
              onChange={e => setComposeContent(e.target.value)}
              onFocus={() => setComposeFocused(true)}
              onBlur={() => { if (!composeContent.trim()) setComposeFocused(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost(); }}
              rows={composeFocused ? 3 : 1}
              placeholder="What's on your mind?"
              className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed"
            />
            {composeFocused && (
              <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                <AuthorPicker value={composeAuthor} onChange={setComposeAuthor} />
                <Dropdown
                  value={composeType}
                  onChange={setComposeType}
                  options={TYPES}
                />
                <button
                  onClick={handlePost}
                  disabled={!composeContent.trim() || posting}
                  className="ml-auto flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 transition-all active:scale-95"
                >
                  {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0.5 px-1 py-2 sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
        {FILTER_TABS.map(tab => {
          const Icon = tab.icon;
          const active = filterType === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all',
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
            <MessageCircle className="h-7 w-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm text-muted-foreground">No posts yet</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Be the first to share something</p>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onTogglePin={handleTogglePin}
              onDelete={handleDelete}
              onReply={handleReply}
              onLoadReplies={handleLoadReplies}
            />
          ))}
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-2xl hover:bg-muted/30 transition-all flex items-center justify-center gap-2"
            >
              {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
