import React, { useState } from 'react';
import TagPicker from './TagPicker';

function PaperCard({ paper, onUpdate, isSaved, onToggleSave }) {
  const [expanded, setExpanded] = useState(false);

  const authors = paper.authors || [];
  const authorsText = authors.slice(0, 3).join(', ') + (authors.length > 3 ? ` +${authors.length - 3} more` : '');
  const referencedDatasets = paper.referenced_datasets || [];

  return (
    <div className={`card paper-card ${isSaved ? 'saved-highlight' : ''}`}>
      <div className="paper-header">
        <div className="paper-badges">
          {paper.primary_category && (
            <span className="badge category-badge">{paper.primary_category}</span>
          )}
          <span className="badge id-badge">arXiv:{paper.base_id}</span>
        </div>
        <button
          type="button"
          className={`save-button ${isSaved ? 'saved' : ''}`}
          onClick={() => onToggleSave && onToggleSave(paper.base_id)}
          title={isSaved ? 'Remove from saved' : 'Save paper'}
        >
          {isSaved ? '★ Saved' : '☆ Save'}
        </button>
      </div>

      <h3 className="paper-title">
        <a href={paper.abs_url || `https://arxiv.org/abs/${paper.base_id}`} target="_blank" rel="noreferrer">
          {paper.title || 'Untitled Paper'}
        </a>
      </h3>

      {authors.length > 0 && (
        <p className="paper-authors">{authorsText}</p>
      )}

      {referencedDatasets.length > 0 && (
        <div className="dataset-tags-container">
          <span className="dataset-label">Datasets:</span>
          {referencedDatasets.map((ds, idx) => (
            <span key={idx} className="dataset-chip" title={`Hugging Face: ${ds.repo_id}`}>
              📦 {ds.name}
            </span>
          ))}
        </div>
      )}

      <p className="paper-abstract">
        {expanded ? paper.abstract : `${paper.abstract?.slice(0, 180)}...`}
        {paper.abstract && paper.abstract.length > 180 && (
          <button
            type="button"
            className="expand-btn"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? ' Show Less' : ' Read More'}
          </button>
        )}
      </p>

      <div className="paper-footer">
        <TagPicker
          paperId={paper.base_id}
          initialTags={paper.tags || []}
          onTagsChange={() => onUpdate && onUpdate()}
        />
        <div className="paper-links">
          {paper.pdf_url && (
            <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="paper-link-btn">
              PDF ↗
            </a>
          )}
          <a href={paper.abs_url || `https://arxiv.org/abs/${paper.base_id}`} target="_blank" rel="noreferrer" className="paper-link-btn">
            arXiv ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default PaperCard;
