import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const SUGGESTED_PROMPTS = [
  '🔬 What are the latest robotics papers?',
  '🤖 Explain LeRobot PushT dataset',
  '📈 How does trajectory sync work?',
  '📑 How do I use the dashboard?',
];

function renderMarkdownMessage(text) {
  // Simple markdown renderer for bold, links, code, and lists
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Process markdown links [Title](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.substring(lastIndex, match.index));
      }
      const label = match[1];
      const url = match[2];

      if (url.startsWith('/')) {
        parts.push(
          <Link key={match.index} to={url} className="chat-link internal-link">
            {label}
          </Link>
        );
      } else {
        parts.push(
          <a
            key={match.index}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="chat-link external-link"
          >
            {label} ↗
          </a>
        );
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      parts.push(line.substring(lastIndex));
    }

    // Format bold and backticks in raw string parts
    const formattedParts = parts.map((part, pIdx) => {
      if (typeof part !== 'string') return part;
      
      // Replace **text** with <strong> and `code` with <code>
      const subParts = part.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
      return subParts.map((sub, sIdx) => {
        if (sub.startsWith('**') && sub.endsWith('**')) {
          return <strong key={sIdx}>{sub.slice(2, -2)}</strong>;
        }
        if (sub.startsWith('`') && sub.endsWith('`')) {
          return <code key={sIdx} className="chat-inline-code">{sub.slice(1, -1)}</code>;
        }
        return sub;
      });
    });

    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={idx} className="chat-list-item">
          {formattedParts}
        </li>
      );
    }

    return (
      <p key={idx} className="chat-paragraph">
        {formattedParts}
      </p>
    );
  });
}

function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "👋 Hello! I am **RoboChat**, your AI Robotics Research Assistant. Ask me anything about arXiv robotics papers, LeRobot datasets, trajectory scrubbing, or your research dashboard!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSend = async (userPrompt) => {
    const textToSend = userPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: 'user', content: textToSend.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Build history
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await api.sendChatMessage(textToSend.trim(), history);
      
      const assistantMsg = {
        role: 'assistant',
        content: res.response || "I couldn't process that query. Please try again!",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${err.message || 'Failed to get response from RoboChat server.'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content:
          "Chat cleared. How can I assist you with your robotics research today?",
      },
    ]);
  };

  return (
    <div className="chatbot-root">
      {/* 1. Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          type="button"
          className="chatbot-fab"
          onClick={() => setIsOpen(true)}
          title="Open RoboChat AI Assistant"
        >
          <span className="fab-icon">🤖</span>
          <span className="fab-pulse" />
          <span className="fab-label">RoboChat AI</span>
        </button>
      )}

      {/* 2. Chatbot Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar-badge">🤖</div>
              <div>
                <h3 className="chatbot-title">RoboChat AI</h3>
                <span className="chatbot-status">
                  <span className="status-dot" /> Online • Robotics Assistant
                </span>
              </div>
            </div>

            <div className="chatbot-header-actions">
              <button
                type="button"
                className="btn-chat-header"
                onClick={clearChat}
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                type="button"
                className="btn-chat-header"
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message-row ${msg.role === 'user' ? 'row-user' : 'row-assistant'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="msg-avatar assistant-avatar">🤖</div>
                )}
                <div className={`chat-bubble bubble-${msg.role}`}>
                  {renderMarkdownMessage(msg.content)}
                </div>
                {msg.role === 'user' && (
                  <div
                    className="msg-avatar user-avatar"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff' }}
                  >
                    👤
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="chat-message-row row-assistant">
                <div className="msg-avatar assistant-avatar">🤖</div>
                <div className="chat-bubble bubble-assistant typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          {messages.length <= 2 && (
            <div className="chatbot-suggested-prompts">
              <span className="suggested-title">💡 Suggested queries:</span>
              <div className="prompt-chips-wrap">
                {SUGGESTED_PROMPTS.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    className="prompt-chip"
                    onClick={() => handleSend(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <form
            className="chatbot-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="chat-text-input"
              placeholder="Ask about papers, datasets, trajectories..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-chat-send"
              disabled={loading || !input.trim()}
              title="Send message"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatbotWidget;
