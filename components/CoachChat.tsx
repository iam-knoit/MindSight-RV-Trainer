
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, User, Bot, Sparkles, Loader2 } from 'lucide-react';
import { ChatMessage, SessionData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { createCoachChat } from '../services/geminiService';
import { Chat } from '@google/genai';

interface CoachChatProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionData[];
}

const formatText = (text: string) => {
  // Simple bold parser for **text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const CoachChat: React.FC<CoachChatProps> = ({ isOpen, onClose, history }) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Chat Session when opened
  useEffect(() => {
    if (isOpen && !chatSession) {
      const newChat = createCoachChat(history, language);
      setChatSession(newChat);
      // Add initial welcome message
      setMessages([
        {
          id: 'init',
          role: 'model',
          text: t('chatWelcome'),
          timestamp: Date.now()
        }
      ]);
    }
  }, [isOpen, history, language, chatSession, t]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !chatSession || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg.text });
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text || "I'm having trouble thinking right now.",
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Connection error. Please try again.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Slide-in Drawer */}
      <div className="w-full max-w-md h-full bg-slate-950 border-l border-slate-800 pointer-events-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur flex justify-between items-center z-10 shadow-sm">
          <div className="flex items-center gap-3">
             <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
               <Sparkles size={20} className="text-blue-400" />
             </div>
             <div>
                <h3 className="text-white font-bold text-sm">{t('chatTitle')}</h3>
                <p className="text-xs text-slate-500 font-medium">Remote Viewing Instructor</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-slate-950 custom-scrollbar">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className="shrink-0">
                  {msg.role === 'model' ? (
                     <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-sm mt-1">
                        <Bot size={16} className="text-blue-400" />
                     </div>
                  ) : (
                     <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-sm mt-1">
                        <User size={16} className="text-white" />
                     </div>
                  )}
                </div>

                {/* Bubble */}
                <div className="flex flex-col gap-1">
                    <div 
                        className={`
                        rounded-2xl p-3.5 text-sm leading-7 shadow-md whitespace-pre-wrap
                        ${msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-800'}
                        `}
                    >
                        {formatText(msg.text)}
                    </div>
                    <span className={`text-[10px] text-slate-600 ${msg.role === 'user' ? 'text-right' : 'text-left'} px-1`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                </div>

              </div>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start w-full">
               <div className="flex gap-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 mt-1">
                     <Bot size={16} className="text-blue-400" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 flex items-center gap-2">
                     <span className="w-2 h-2 bg-blue-500/50 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-blue-500/50 rounded-full animate-bounce delay-75"></span>
                     <span className="w-2 h-2 bg-blue-500/50 rounded-full animate-bounce delay-150"></span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur">
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('chatPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3.5 pl-4 pr-12 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-slate-500 transition-all text-sm"
              autoFocus
            />
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 active:scale-95"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoachChat;
