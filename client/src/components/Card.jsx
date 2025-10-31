import React from 'react';

export default function Card({ deal }) {
  const { title, price, link } = deal || {};
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }} title={title || ''}>
          {title || 'Untitled'}
        </div>
        {price && (
          <span style={{
            display: 'inline-block',
            marginTop: 6,
            backgroundColor: '#eef2ff',
            color: '#3730a3',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 9999
          }}>
            {price}
          </span>
        )}
      </div>
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backgroundColor: '#111827',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: 6,
            textDecoration: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          Open
        </a>
      )}
    </div>
  );
}




