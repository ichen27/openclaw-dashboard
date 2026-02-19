'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

interface MessageAgentProps {
  sessionKey: string;
  agentName: string;
}

export function MessageAgent({ sessionKey, agentName }: MessageAgentProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setLoading(true);
    setError(null);
    setResponse(null);
    
    try {
      const res = await fetch('/api/agents/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey, message }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setResponse(data.output || 'Message sent successfully');
        setMessage('');
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder={`Message ${agentName}...`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={loading || !message.trim()}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {response && (
        <div className="text-xs p-2 bg-muted rounded border border-border">
          <div className="text-muted-foreground mb-1">Response:</div>
          <div className="font-mono whitespace-pre-wrap">{response}</div>
        </div>
      )}
      
      {error && (
        <div className="text-xs p-2 bg-red-500/10 text-red-400 rounded border border-red-500/30">
          {error}
        </div>
      )}
    </div>
  );
}
