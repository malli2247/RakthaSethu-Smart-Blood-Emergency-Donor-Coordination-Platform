import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, AlertCircle, MessageSquare } from 'lucide-react';
import { aiApi } from '../services/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  disclaimer?: string;
  suggestedFollowUps?: string[];
}

export const AiChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your **RakthaSethu Emergency & Blood Assistant**. How can I help you today? You can ask about blood compatibility, donor eligibility, or emergency procedures.',
      suggestedFollowUps: [
        'Why is O- blood so important?',
        'Who can donate to B+ blood?',
        'What should I do in a blood emergency?',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await aiApi.chat(textToSend);
      const { reply, disclaimer, suggestedFollowUps } = res.data.data;

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        disclaimer,
        suggestedFollowUps,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'I apologize, but I could not reach the emergency knowledge service. If this is a medical emergency, please call 112 or head to your nearest hospital.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-rose-600 to-red-600 text-white rounded-full shadow-lg shadow-rose-300 hover:shadow-xl hover:scale-105 transition-all"
        >
          <Bot className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-bold">Ask AI Assistant</span>
        </button>
      ) : (
        <div className="w-96 sm:w-[420px] h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-red-600 p-4 text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  RakthaSethu AI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                </h3>
                <p className="text-[11px] text-rose-100">Emergency & Compatibility Guidance</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-rose-600 text-white rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {m.text}
                </div>

                {m.disclaimer && (
                  <div className="mt-1.5 max-w-[85%] p-2 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-800 flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                    <span>{m.disclaimer}</span>
                  </div>
                )}

                {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.suggestedFollowUps.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(chip)}
                        className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-full text-[11px] font-medium transition-colors text-left"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl rounded-bl-none border border-slate-200 w-24">
                <div className="w-2 h-2 rounded-full bg-rose-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-rose-600 animate-bounce delay-200" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a blood or emergency question..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
