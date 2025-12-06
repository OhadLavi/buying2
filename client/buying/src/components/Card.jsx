import React from 'react';

const SITE_NAMES = {
  deal4real: 'Deal4Real',
  zuzu: 'Zuzu',
  buywithus: 'BuyWithUs'
};

export default function Card({ deal, site, language = 'he', viewMode = 'list', onOpenClick }) {
  const { title, price, link, image } = deal || {};
  const siteName = SITE_NAMES[site] || site || '';
  const isRTL = language === 'he';
  const isGrid = viewMode === 'grid';
  
  const handleButtonClick = (e) => {
    e.preventDefault();
    if (link && onOpenClick) {
      onOpenClick(link);
    }
  };
  
  return (
    <div style={{
      border: '1px solid',
      borderColor: 'var(--border-color)',
      borderRadius: 12,
      padding: 0,
      backgroundColor: 'var(--card-bg)',
      transition: 'all 0.2s',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: isGrid ? 'column' : (isRTL ? 'row-reverse' : 'row'),
      minHeight: isGrid ? 280 : 140,
      height: isGrid ? '100%' : 'auto'
    }}>
      {/* Image Section */}
      {image && (
        <div style={{
          width: isGrid ? '100%' : 160,
          minWidth: isGrid ? '100%' : 160,
          height: isGrid ? 180 : 'auto',
          flexShrink: 0,
          backgroundColor: 'var(--skeleton-bg)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <img
            src={image}
            alt={title || 'Product image'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
      
      {/* Content Section */}
      <div style={{
        flex: 1,
        padding: isGrid ? 12 : 16,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minWidth: 0
      }}>
        {/* Top: Title and Site tag */}
        <div style={{ flex: 1 }}>
            {title && (
              <h3 style={{
                fontSize: isGrid ? 16 : 18,
                fontWeight: 700,
                color: 'var(--text-primary)',
                lineHeight: 1.4,
                margin: '0 0 8px 0',
                wordBreak: 'break-word',
                textAlign: isRTL ? 'right' : 'left',
                minWidth: 0,
                display: '-webkit-box',
                WebkitLineClamp: isGrid ? 2 : 'none',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {title}
              </h3>
            )}
          
          {siteName && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: 12,
              backgroundColor: 'var(--tag-bg)',
              color: 'var(--tag-color)',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              marginBottom: 8
            }}>
              {siteName}
            </span>
          )}
        </div>
        
        {/* Bottom: Button (left) and Price (right) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 12,
          marginTop: 'auto',
          paddingTop: 12,
          borderTop: '1px solid var(--border-color)',
          direction: 'ltr', // Force LTR direction for this section
          flexDirection: 'row' // Always LTR for this section - button left, price right
        }}>
          {link && (
            <button
              onClick={handleButtonClick}
              style={{
                backgroundColor: 'var(--button-bg)',
                color: 'var(--button-color)',
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                whiteSpace: 'nowrap',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.2s',
                flexShrink: 0,
                order: 1, // Button first (left)
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {language === 'he' ? 'פתח עסקה' : 'View Deal'}
            </button>
          )}
          
          {price && (
            <div style={{
              fontSize: isGrid ? 20 : 22,
              fontWeight: 800,
              color: 'var(--price-color)',
              letterSpacing: '-0.5px',
              marginLeft: 'auto',
              textAlign: 'right',
              order: 2, // Price second (right)
              flexShrink: 0
            }}>
              {price}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
