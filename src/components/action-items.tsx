'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, X, Bot, ListTodo, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ActionItem {
  id: string
  text: string
  done: boolean
  source: string | null
  sourceRef: string | null
  priority: string
  order: number
}

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/15 text-red-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-green-500/15 text-green-400',
}

export function ActionItems() {
  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchItems = useCallback(async () => {
    const res = await fetch('/api/actions')
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  async function handleToggle(item: ActionItem) {
    await fetch('/api/actions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: item.id, done: !item.done }]),
    })
    await fetchItems()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    setAdding(true)
    await fetch('/api/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, priority: 'medium' }),
    })
    setNewText('')
    await fetchItems()
    setAdding(false)
  }

  async function handleDelete(id: string) {
    if (id.startsWith('virtual-')) return
    await fetch('/api/actions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await fetchItems()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="size-5" />
          Action Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Add action item…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <Button type="submit" size="sm" disabled={adding || !newText.trim()}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-zinc-400" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">No action items</p>
        ) : (
          <div>
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 py-2 border-b border-zinc-800 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => handleToggle(item)}
                  className="cursor-pointer"
                />

                {item.source === 'agent-review' && (
                  <Bot className="size-4 text-blue-400 shrink-0" />
                )}

                <span
                  className={`flex-1 text-sm ${item.done ? 'line-through opacity-50' : ''}`}
                >
                  {item.source === 'agent-review' && item.sourceRef ? (
                    <a href="/tasks" className="hover:underline text-blue-400">
                      {item.text}
                    </a>
                  ) : (
                    item.text
                  )}
                </span>

                <Badge
                  variant="outline"
                  className={`text-xs border-0 ${priorityStyles[item.priority] ?? priorityStyles.medium}`}
                >
                  {item.priority}
                </Badge>

                {!item.id.startsWith('virtual-') && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
