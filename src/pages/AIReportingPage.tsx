import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Outlet {
  id: string;
  name: string;
}

const SUGGESTIONS = [
  'Which ingredients have the highest variance loss this period?',
  'What are our 5 highest cost cocktails by recipe cost?',
  'Summarize recent stock adjustments and wastage reasons',
  'Which items are running low on stock right now?',
];

export function AIReportingPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadOutlets = async () => {
      const { data } = await supabase.from('outlets').select('id, name').order('name');
      setOutlets(data || []);
    };
    loadOutlets();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-report', {
        body: { question, outletId: outletId || null },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err: any) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">AI Reporting</h1>
            <p className="text-sm text-zinc-400">Ask questions about live inventory, variance, and recipe data</p>
          </div>
        </div>

        <select
          value={outletId}
          onChange={(e) => setOutletId(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        >
          <option value="">All Outlets</option>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-zinc-400 text-sm max-w-sm">
              Ask anything about variance, stock levels, recipe costs, deliveries, or shift data — answers are
              grounded in live BevCore data.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="text-left text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-amber-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-50'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
              }`}
            >
              {m.content}
            </div>
            {m.role === 'user' && (
              <div className="h-8 w-8 shrink-0 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <User className="h-4 w-4 text-zinc-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Bot className="h-4 w-4 text-amber-400" />
            </div>
            <div className="rounded-xl px-4 py-3 text-sm bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing data...
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about variance, stock, recipes, deliveries..."
          className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-full px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-colors flex items-center justify-center"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
