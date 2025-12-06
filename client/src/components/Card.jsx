import React from 'react';
import '../App.css';

export default function Card({ deal, isRTL = false, viewMode = 'cards' }) {
  const { title, price, link, image } = deal || {};
  const isTileView = viewMode === 'tiles';
  
  return (
    <div className={`deal-card ${isTileView ? 'deal-tile' : 'deal-card-view'}`}>
      {image && (
        <div className="deal-image-wrapper">
          <img 
            src={image} 
            alt={title || 'Deal image'} 
            className="deal-image"
            loading="lazy"
            onError={(e) => {
              // Hide image wrapper if image fails to load
              const wrapper = e.target.closest('.deal-image-wrapper');
              if (wrapper) {
                wrapper.style.display = 'none';
              }
            }}
          />
        </div>
      )}
      <div className="deal-content">
        <div className="deal-title" title={title || ''}>
          {title || 'Untitled'}
        </div>
        {price && (
          <span className="deal-price">
            {price}
          </span>
        )}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="deal-link"
        >
          {isRTL ? 'פתח' : 'Open'}
        </a>
      )}
    </div>
  );
}






