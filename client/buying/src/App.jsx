import React, { useEffect, useMemo, useState } from 'react';
import Card from './components/Card';
import './App.css';

const DEFAULT_DATA = { deal4real: [], zuzu: [], buywithus: [] };

const SECTIONS = [
  { key: 'deal4real', title: 'Deal4Real', titleHe: 'Deal4Real' },
  { key: 'zuzu', title: 'Zuzu Deals', titleHe: 'Zuzu Deals' },
  { key: 'buywithus', title: 'BuyWithUs', titleHe: 'BuyWithUs' },
];

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'he'; // Default to Hebrew
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState({
    deal4real: true,
    zuzu: true,
    buywithus: true
  });
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('viewMode');
    return saved || 'list'; // Default to list view
  });
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState('');

  // Apply dark mode to root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Apply language to root
  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', language === 'he' ? 'rtl' : 'ltr');
    localStorage.setItem('language', language);
  }, [language]);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [modalOpen]);

  const handleOpenDeal = (url) => {
    setModalUrl(url);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalUrl('');
  };

  const apiBase = useMemo(() => {
    const env = process.env.REACT_APP_API_URL;
    if (env) return env.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      // If on GitHub Pages or production, use Render API
      if (window.location.hostname.includes('github.io') || process.env.NODE_ENV === 'production') {
        return 'https://buying2.onrender.com';
      }
      // Development: try same origin with port 3001
      const sameOrigin = `${window.location.protocol}//${window.location.hostname}:3001`;
      return sameOrigin;
    }
    return 'http://localhost:3001';
  }, []);

  const clearCacheAndFetch = async () => {
    try {
      await fetch(`${apiBase}/clear-cache`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${apiBase}/scrape?sources=deal4real,zuzu,buywithus`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      const newData = {
        deal4real: Array.isArray(json.deal4real) ? json.deal4real : [],
        zuzu: Array.isArray(json.zuzu) ? json.zuzu : [],
        buywithus: Array.isArray(json.buywithus) ? json.buywithus : [],
      };
      
      setData(newData);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e?.message || 'נכשל ביבוא המידע / Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combine all deals from all sources into one array
  const allDeals = useMemo(() => {
    const combined = [];
    SECTIONS.forEach(sec => {
      if (data[sec.key] && Array.isArray(data[sec.key])) {
        data[sec.key].forEach(deal => {
          combined.push({ ...deal, site: sec.key });
        });
      }
    });
    return combined;
  }, [data]);

  // Filter deals based on filters
  const filteredDeals = useMemo(() => {
    let filtered = allDeals.filter(deal => {
      // Source filter
      if (!selectedSources[deal.site]) return false;
      
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = deal.title?.toLowerCase().includes(query);
        if (!titleMatch) return false;
      }
      
      // Price range filter
      if (minPrice || maxPrice) {
        const priceStr = deal.price || '';
        const priceMatch = priceStr.match(/[\d,.]+/);
        if (priceMatch) {
          const priceNum = parseFloat(priceMatch[0].replace(/,/g, ''));
          if (minPrice && priceNum < parseFloat(minPrice)) return false;
          if (maxPrice && priceNum > parseFloat(maxPrice)) return false;
        } else {
          // If no price found and filters are set, exclude
          if (minPrice || maxPrice) return false;
        }
      }
      
      return true;
    });
    
    return filtered;
  }, [allDeals, selectedSources, searchQuery, minPrice, maxPrice]);

  const formatTime = (d) => {
    if (!d) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const toggleLanguage = () => setLanguage(prev => prev === 'he' ? 'en' : 'he');

  return (
    <div className="app-container" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <style>{`
        :root[data-theme="light"] {
          --bg-primary: #ffffff;
          --bg-secondary: #f9fafb;
          --text-primary: #111827;
          --text-secondary: #6b7280;
          --border-color: #e5e7eb;
          --card-bg: #ffffff;
          --tag-bg: #eef2ff;
          --tag-color: #3730a3;
          --button-bg: #111827;
          --button-color: #ffffff;
          --price-color: #059669;
          --error-bg: #fef2f2;
          --error-text: #dc2626;
          --skeleton-bg: #f3f4f6;
        }
        
        :root[data-theme="dark"] {
          --bg-primary: #111827;
          --bg-secondary: #1f2937;
          --text-primary: #f9fafb;
          --text-secondary: #9ca3af;
          --border-color: #374151;
          --card-bg: #1f2937;
          --tag-bg: #3730a3;
          --tag-color: #e0e7ff;
          --button-bg: #3b82f6;
          --button-color: #ffffff;
          --price-color: #10b981;
          --error-bg: #7f1d1d;
          --error-text: #fca5a5;
          --skeleton-bg: #374151;
        }
        
        .app-container {
          min-height: 100vh;
          background-color: var(--bg-primary);
          color: var(--text-primary);
          transition: background-color 0.3s, color 0.3s;
        }
      `}</style>
      
      <header style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '20px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <h1 style={{ fontSize: 24, margin: 0, fontWeight: 700 }}>
          {language === 'he' ? 'אוגר הדילים' : 'Deals Aggregator'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {language === 'he' ? `עודכן לאחרונה: ${formatTime(lastUpdated)}` : `Last updated: ${formatTime(lastUpdated)}`}
          </span>
          <button 
            onClick={fetchData} 
            style={{ 
              padding: '10px 20px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
              height: '40px',
              lineHeight: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {language === 'he' ? 'רענן' : 'Refresh'}
          </button>
          <button 
            onClick={clearCacheAndFetch} 
            style={{ 
              padding: '10px 20px', 
              borderRadius: 8, 
              border: '1px solid var(--border-color)', 
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
              height: '40px',
              lineHeight: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title={language === 'he' ? 'נקה מטמון ורענן' : 'Clear cache and refresh'}
          >
            🔄
          </button>
          <button
            onClick={toggleLanguage}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
              height: '40px',
              lineHeight: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {language === 'he' ? 'English' : 'עברית'}
          </button>
          <button
            onClick={toggleDarkMode}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
              height: '40px',
              lineHeight: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {darkMode ? (language === 'he' ? '☀️ בהיר' : '☀️ Light') : (language === 'he' ? '🌙 כהה' : '🌙 Dark')}
          </button>
          <button
            onClick={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s',
              height: '40px',
              lineHeight: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            title={language === 'he' 
              ? (viewMode === 'list' ? 'הצג כגריד' : 'הצג כשורה')
              : (viewMode === 'list' ? 'Switch to Grid' : 'Switch to List')
            }
          >
            {viewMode === 'list' ? (language === 'he' ? '⊞ גריד' : '⊞ Grid') : (language === 'he' ? '☰ שורה' : '☰ List')}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 40px' }}>
        {error && (
          <div style={{ 
            marginTop: 16, 
            padding: 12,
            borderRadius: 8,
            backgroundColor: 'var(--error-bg)',
            color: 'var(--error-text)'
          }}>
            {language === 'he' ? `שגיאה: ${String(error)}` : `Error: ${String(error)}`}
          </div>
        )}

        {/* Filters Section */}
        <div style={{
          marginTop: 24,
          backgroundColor: 'var(--card-bg)',
          borderRadius: 12,
          border: '1px solid var(--border-color)',
          boxSizing: 'border-box',
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          {/* Filter Header - Always Visible */}
          <div
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {language === 'he' ? 'סינון עסקאות' : 'Filter Deals'}
            </h2>
            <span style={{ fontSize: 20, color: 'var(--text-secondary)', transition: 'transform 0.2s' }}>
              {filtersExpanded ? '▲' : '▼'}
            </span>
          </div>

          {/* Filter Content - Collapsible */}
          {filtersExpanded && (
            <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-color)' }}>
              {/* Search */}
              <div style={{ marginTop: 16, marginBottom: 16, width: '100%', boxSizing: 'border-box' }}>
                <input
                  type="text"
                  placeholder={language === 'he' ? 'חפש בכותרת...' : 'Search in title...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Source Filters */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                  {language === 'he' ? 'מקורות:' : 'Sources:'}
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {SECTIONS.map(sec => (
                    <label key={sec.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={selectedSources[sec.key]}
                        onChange={(e) => setSelectedSources(prev => ({ ...prev, [sec.key]: e.target.checked }))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>
                        {language === 'he' ? sec.titleHe : sec.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {language === 'he' ? 'טווח מחירים:' : 'Price Range:'}
                </div>
                <input
                  type="number"
                  placeholder={language === 'he' ? 'מינימום' : 'Min'}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    width: 120
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>-</span>
                <input
                  type="number"
                  placeholder={language === 'he' ? 'מקסימום' : 'Max'}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    width: 120
                  }}
                />
                {(minPrice || maxPrice) && (
                  <button
                    onClick={() => { setMinPrice(''); setMaxPrice(''); }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    {language === 'he' ? 'איפוס' : 'Reset'}
                  </button>
                )}
              </div>

              {/* Results count */}
              <div style={{ marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                {language === 'he' 
                  ? `מציג ${filteredDeals.length} מתוך ${allDeals.length} עסקאות`
                  : `Showing ${filteredDeals.length} of ${allDeals.length} deals`
                }
              </div>
            </div>
          )}
        </div>

        {/* Quick Site Filter Buttons */}
        <div style={{
          marginTop: 16,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: language === 'he' ? 'flex-start' : 'flex-start',
          direction: language === 'he' ? 'rtl' : 'ltr'
        }}>
          {/* "All" button - positioned first (right in RTL/Hebrew, left in LTR/English) */}
          <button
            onClick={() => {
              setSelectedSources({
                deal4real: true,
                zuzu: true,
                buywithus: true
              });
            }}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: Object.values(selectedSources).every(v => v) && Object.values(selectedSources).length === 3
                ? 'var(--button-bg)'
                : 'var(--card-bg)',
              color: Object.values(selectedSources).every(v => v) && Object.values(selectedSources).length === 3
                ? 'var(--button-color)'
                : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              order: -1 // Always first (right in RTL, left in LTR)
            }}
            onMouseEnter={(e) => {
              if (!(Object.values(selectedSources).every(v => v) && Object.values(selectedSources).length === 3)) {
                e.currentTarget.style.opacity = '0.8';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {language === 'he' ? 'הכל' : 'All'}
          </button>
          
          {/* Site buttons */}
          {SECTIONS.map(sec => {
            const isOnlyThisSource = Object.keys(selectedSources).every(
              key => key === sec.key ? selectedSources[key] : !selectedSources[key]
            );
            return (
              <button
                key={sec.key}
                onClick={() => {
                  const newSources = {
                    deal4real: false,
                    zuzu: false,
                    buywithus: false,
                    [sec.key]: true
                  };
                  setSelectedSources(newSources);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: isOnlyThisSource ? 'var(--button-bg)' : 'var(--card-bg)',
                  color: isOnlyThisSource ? 'var(--button-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  order: 0 // Normal order after "All"
                }}
                onMouseEnter={(e) => {
                  if (!isOnlyThisSource) {
                    e.currentTarget.style.opacity = '0.8';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {language === 'he' ? sec.titleHe : sec.title}
              </button>
            );
          })}
        </div>

        {/* Deals List/Grid */}
        {loading ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : '1fr',
            gap: 16,
            marginTop: 24
          }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ 
                height: viewMode === 'grid' ? 280 : 140, 
                background: 'var(--skeleton-bg)', 
                borderRadius: 12,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            ))}
          </div>
        ) : filteredDeals.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: viewMode === 'grid' 
              ? 'repeat(auto-fill, minmax(300px, 1fr))' 
              : '1fr',
            gap: 16,
            marginTop: 24
          }}>
            {filteredDeals.map((deal, idx) => (
              <Card 
                key={deal.link || deal.title || idx} 
                deal={deal} 
                site={deal.site} 
                language={language}
                viewMode={viewMode}
                onOpenClick={handleOpenDeal}
              />
            ))}
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)', padding: 24, marginTop: 24, textAlign: 'center' }}>
            {language === 'he' 
              ? searchQuery || minPrice || maxPrice || !Object.values(selectedSources).some(v => v)
                ? 'לא נמצאו עסקאות התואמות לסינון שלך.'
                : 'לא נמצאו עסקאות כרגע.'
              : searchQuery || minPrice || maxPrice || !Object.values(selectedSources).some(v => v)
                ? 'No deals match your filters.'
                : 'No deals found right now.'
            }
          </div>
        )}
      </main>
      
      {/* Modal/Popup */}
      {modalOpen && (
        <div
          id="modal-overlay"
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20
          }}
        >
          <div
            style={{
              width: '90%',
              maxWidth: 1200,
              height: '90%',
              maxHeight: 900,
              backgroundColor: 'var(--card-bg)',
              borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}>
              <h2 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--text-primary)',
                flex: 1
              }}>
                {language === 'he' ? 'פרטי העסקה' : 'Deal Details'}
              </h2>
              <button
                onClick={handleCloseModal}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--button-bg)';
                  e.currentTarget.style.color = 'var(--button-color)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                title={language === 'he' ? 'סגור' : 'Close'}
              >
                ×
              </button>
            </div>
            
            {/* Modal Content (iframe) */}
            <iframe
              src={modalUrl}
              style={{
                flex: 1,
                border: 'none',
                width: '100%',
                height: '100%',
                backgroundColor: '#fff'
              }}
              title="Deal content"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
