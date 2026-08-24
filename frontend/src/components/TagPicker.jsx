import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';

function TagPicker({ paperId, initialTags = [], onTagsChange }) {
  const [tags, setTags] = useState(initialTags);
  const [allTags, setAllTags] = useState([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const loadAllTags = async () => {
    try {
      const res = await api.listTags();
      setAllTags(res.tags || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadAllTags();
  }, []);

  useEffect(() => {
    if (input.trim().length > 0) {
      const filtered = allTags.filter(
        t => t.toLowerCase().includes(input.trim().toLowerCase()) && !tags.includes(t)
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [input, allTags, tags]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = async (tagName) => {
    const cleanTag = tagName.trim();
    if (!cleanTag || tags.includes(cleanTag)) return;
    try {
      await api.addPaperTag(paperId, cleanTag);
      const newTags = [...tags, cleanTag];
      setTags(newTags);
      setInput('');
      setSuggestions([]);
      setIsOpen(false);
      if (!allTags.includes(cleanTag)) {
        setAllTags(prev => [...prev, cleanTag]);
      }
      onTagsChange && onTagsChange(newTags);
    } catch (e) {
      console.error("Failed to add tag:", e);
    }
  };

  const handleRemoveTag = async (tagName) => {
    try {
      await api.removePaperTag(paperId, tagName);
      const newTags = tags.filter(t => t !== tagName);
      setTags(newTags);
      onTagsChange && onTagsChange(newTags);
    } catch (e) {
      console.error("Failed to remove tag:", e);
    }
  };

  return (
    <div className="tag-picker-container" ref={wrapperRef}>
      <div className="tag-list">
        {tags.map(tag => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button
              type="button"
              className="tag-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              title="Remove tag"
            >
              ×
            </button>
          </span>
        ))}

        {!isOpen ? (
          <button
            type="button"
            className="tag-add-btn"
            onClick={() => {
              setIsOpen(true);
              loadAllTags();
            }}
          >
            + Tag
          </button>
        ) : (
          <div className="tag-input-wrapper">
            <input
              type="text"
              autoFocus
              className="tag-input"
              value={input}
              placeholder="Tag name..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) {
                  e.preventDefault();
                  handleAddTag(input.trim());
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
            {suggestions.length > 0 && (
              <div className="tag-dropdown">
                {suggestions.map(s => (
                  <div
                    key={s}
                    className="tag-dropdown-item"
                    onClick={() => handleAddTag(s)}
                  >
                    #{s}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TagPicker;
