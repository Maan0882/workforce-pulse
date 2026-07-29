'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';

const formatMessage = (text: string) => {
  return text.split('\n').map((line, lineIdx) => {
    // Check if it's a list item
    const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
    const cleanedLine = isListItem ? line.trim().substring(2) : line;

    // Parse bold text
    const parts = cleanedLine.split(/(\*\*.*?\*\*)/g);
    const formattedParts = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: 'var(--accent-hover)' }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isListItem) {
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <span style={{ color: 'var(--accent-color)' }}>•</span>
          <div>{formattedParts}</div>
        </div>
      );
    }

    return <div key={lineIdx} style={{ minHeight: '8px' }}>{formattedParts}</div>;
  });
};

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      
      setMessages(prev => [...prev, data.message]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 50 }} className="no-print">
      {isOpen ? (
        <div style={{ 
          width: '380px', 
          height: '550px', 
          display: 'flex', 
          flexDirection: 'column', 
          background: 'var(--panel-bg)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border)', 
          borderRadius: '20px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px var(--glow-accent)',
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ 
            padding: '1.2rem', 
            borderBottom: '1px solid var(--glass-border)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            background: 'rgba(255,255,255,0.02)' 
          }}>
            <h3 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
              <Sparkles size={18} style={{ color: 'var(--accent-hover)' }} /> AI Analyst
            </h3>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <X size={18} />
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto', opacity: 0.6 }}>
                <Sparkles size={32} style={{ margin: '0 auto 1rem', color: 'var(--accent-hover)' }} />
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                  Ask me about automation opportunities, costs, and outliers in the data.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', 
                background: m.role === 'user' ? 'linear-gradient(135deg, var(--accent-color), #2563eb)' : 'rgba(255,255,255,0.05)', 
                border: m.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                padding: '0.8rem 1rem', 
                borderRadius: '16px', 
                borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                borderBottomLeftRadius: m.role !== 'user' ? '4px' : '16px',
                maxWidth: '85%', 
                fontSize: '0.95rem',
                lineHeight: 1.5,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {formatMessage(m.content)}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                <Loader2 size={18} className="animate-spin" style={{ color: 'var(--accent-hover)' }} />
              </div>
            )}
            {error && (
              <div style={{ alignSelf: 'center', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                {error}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.2)' }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about the data..."
              style={{ 
                flex: 1, 
                padding: '0.75rem 1rem', 
                borderRadius: '100px', 
                border: '1px solid var(--glass-border)', 
                background: 'rgba(255,255,255,0.03)', 
                color: 'white',
                outline: 'none',
                fontSize: '0.95rem',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent-color)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()} 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '50%', 
                background: input.trim() ? 'linear-gradient(135deg, var(--accent-hover), var(--accent-color))' : 'rgba(255,255,255,0.1)', 
                border: 'none', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: input.trim() ? '0 4px 10px rgba(37, 99, 235, 0.4)' : 'none'
              }}
            >
              <Send size={18} style={{ transform: 'translateX(2px) translateY(1px)' }} />
            </button>
          </form>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--accent-color), #2563eb)', 
            color: 'white', 
            border: '1px solid rgba(255,255,255,0.2)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.6), 0 0 15px var(--glow-accent)',
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Sparkles size={28} />
        </button>
      )}
    </div>
  );
}
