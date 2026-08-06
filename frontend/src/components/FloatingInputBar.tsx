import React, { useRef, useState } from 'react';
import { Paperclip, Image as ImageIcon, Mic, ArrowUp } from 'lucide-react';

interface FloatingInputBarProps {
  onSendQuery: (query: string) => void;
  isLoading: boolean;
  onAttachDocument?: (file: File) => void;
  onAttachImage?: (file: File) => void;
  onVoiceClick?: () => void;
}

export const FloatingInputBar: React.FC<FloatingInputBarProps> = ({
  onSendQuery,
  isLoading,
  onAttachDocument,
  onAttachImage,
  onVoiceClick,
}) => {
  const [input, setInput] = useState('');
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
          <button
            type="button"
            className="icon-btn"
            title="Attach Document PDF"
            onClick={() => documentInputRef.current?.click()}
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Add Image Asset"
            onClick={() => imageInputRef.current?.click()}
          >
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
          <button
            type="button"
            className="icon-btn"
            title="Voice Input"
            onClick={() => {
              if (onVoiceClick) {
                onVoiceClick();
                return;
              }
              setInput(prev => prev || 'Summarize the highest-risk clauses and the strongest negotiation points.');
            }}
          >
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
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && onAttachDocument) {
            onAttachDocument(file);
          }
          e.currentTarget.value = '';
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const file = e.target.files?.[0];
          if (file && onAttachImage) {
            onAttachImage(file);
          }
          e.currentTarget.value = '';
        }}
      />
      <div className="footer-privacy-text">
        By using ContractClaw you agree to the <a href="/settings">Terms</a> and <a href="/settings">Privacy Policy</a>.
      </div>
    </div>
  );
};
