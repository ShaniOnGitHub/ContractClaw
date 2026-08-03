import React, { useState } from 'react';
import { Paperclip, Image as ImageIcon, Mic, ArrowUp } from 'lucide-react';

interface FloatingInputBarProps {
  onSendQuery: (query: string) => void;
  isLoading: boolean;
}

export const FloatingInputBar: React.FC<FloatingInputBarProps> = ({ onSendQuery, isLoading }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendQuery(input.trim());
    }
  };

  return (
    <div className="floating-input-container">
      <form onSubmit={handleSubmit} className="floating-input-bar">
        <div className="input-bar-left">
          <button type="button" className="icon-btn" title="Attach Document PDF">
            <Paperclip className="w-4 h-4" />
          </button>
          <button type="button" className="icon-btn" title="Add Image Asset">
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about your contract (e.g. 'What are the termination clauses and liability caps?')..."
            className="chat-input"
            disabled={isLoading}
          />
        </div>

        <div className="input-bar-right">
          <button type="button" className="icon-btn" title="Voice Input">
            <Mic className="w-4 h-4" />
          </button>
          <button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="btn-send disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send Query"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </form>
      <div className="footer-privacy-text">
        By using ContractClaw you agree to the <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
};
