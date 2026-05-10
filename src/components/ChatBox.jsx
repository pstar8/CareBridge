import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ShieldCheck } from 'lucide-react';
import { chatMockResponses } from '../data/mockData';

export default function ChatBox({ contextTitle = "this document" }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I can help you understand the information in ${contextTitle}. What would you like to know? Remember, I can explain information but I cannot make medical decisions.`,
    }
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMockResponse = (question) => {
    const lower = question.toLowerCase();
    if ((lower.includes('stop') || lower.includes('change') || lower.includes('dose')) && lower.includes('medicine')) {
      return 'I cannot advise you to stop, change, or adjust medication. Please speak to a doctor or pharmacist. I can help you prepare questions to ask them.';
    }
    for (const [key, value] of Object.entries(chatMockResponses)) {
      if (key !== 'default' && lower.includes(key)) return value;
    }
    return chatMockResponses.default;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    const aiMsg = { role: 'assistant', text: getMockResponse(input) };
    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="bg-teal-600 px-4 py-3 flex items-center gap-2">
        <Bot size={18} className="text-white" />
        <span className="text-white font-semibold text-sm">CareBridge AI Assistant</span>
      </div>

      <div className="p-3 bg-amber-50 border-b border-amber-100 flex gap-2 items-start">
        <ShieldCheck size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">I can help explain information, but I cannot make medical decisions. Always speak to a healthcare professional for medical advice.</p>
      </div>

      <div className="h-64 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-teal-700" />
              </div>
            )}
            <div className={`max-w-xs rounded-xl px-3 py-2 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-teal-600 text-white rounded-br-sm'
                : 'bg-slate-100 text-slate-700 rounded-bl-sm'
            }`}>
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this document..."
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="bg-teal-600 text-white rounded-lg px-3 py-2 disabled:opacity-40 hover:bg-teal-700 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
