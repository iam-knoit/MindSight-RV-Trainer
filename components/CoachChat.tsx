import React, { useState, useEffect, useRef } from 'react';
import { Send, X, User, Bot, MessageSquare, Loader2 } from 'lucide-react';
import { ChatMessage, SessionData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { createCoachChat } from '../services/geminiService';
import { Chat } from '@google/genai';

interface CoachChatProps {
  isOpen: boolean;
  onClose: () => void;
  history: SessionData[];
}

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
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Slide-in Drawer */}
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 pointer-events-auto shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 relative">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <div className="flex items-center gap-2 text-blue-400 font-bold">
             <Bot size={20} />
             <span>{t('chatTitle')}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-950">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`
                  max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}
                `}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl rounded-bl-none p-3 border border-slate-700 flex items-center gap-2">
                 <Loader2 size={16} className="animate-spin text-blue-400" />
                 <span className="text-xs text-slate-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 bg-slate-900">
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('chatPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-4 pr-12 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder:text-slate-500"
            />
            <button 
              type="submit" 
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 top-2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CoachChat;