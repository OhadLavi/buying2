import React, { useEffect, useMemo, useState } from 'react';
import Card from './components/Card';
import './App.css';

const DEFAULT_DATA = { deal4real: [], zuzu: [], buywithus: [], beedeals: [] };

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceErrors, setSourceErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isRTL, setIsRTL] = useState(true); // Default to RTL
  const [viewMode, setViewMode] = useState(() => {
    // Default to 'tiles' so ⊞ (grid icon) is active by default
    return 'tiles';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const apiBase = useMemo(() => {
    const env = process.env.REACT_APP_API_URL;
    if (env) return env.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      const sameOrigin = `${window.location.protocol}//${window.location.hostname}:3001`;
      return sameOrigin;
    }
    return 'http://localhost:3001';
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setSourceErrors({});
    try {
      const url = `${apiBase}/scrape?sources=deal4real,zuzu,buywithus,beedeals`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Check for empty arrays which might indicate errors
      const newData = {
        deal4real: Array.isArray(json.deal4real) ? json.deal4real : [],
        zuzu: Array.isArray(json.zuzu) ? json.zuzu : [],
        buywithus: Array.isArray(json.buywithus) ? json.buywithus : [],
        beedeals: Array.isArray(json.beedeals) ? json.beedeals : [],
      };
      
      // Set per-source errors if array is empty (may indicate scraping failure)
      const newSourceErrors = {};
      if (newData.deal4real.length === 0) {
        newSourceErrors.deal4real = 'No deals found or scraping failed';
      }
      if (newData.zuzu.length === 0) {
        newSourceErrors.zuzu = 'No deals found or scraping failed';
      }
      if (newData.buywithus.length === 0) {
        newSourceErrors.buywithus = 'No deals found or scraping failed';
      }
      if (newData.beedeals.length === 0) {
        newSourceErrors.beedeals = 'No deals found or scraping failed';
      }
      
      setData(newData);
      setSourceErrors(newSourceErrors);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e?.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = [
    { key: 'all', title: 'All', titleRTL: 'הכל' },
    { key: 'deal4real', title: 'Deal4Real' },
    { key: 'zuzu', title: 'Zuzu Deals' },
    { key: 'buywithus', title: 'BuyWithUs' },
    { key: 'beedeals', title: 'Bee Deals' },
  ];

  const formatTime = (d) => {
    if (!d) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Get all deals when "all" tab is selected
  const getAllDeals = () => {
    const allDeals = [];
    sections.forEach(section => {
      if (section.key !== 'all' && data[section.key]) {
        data[section.key].forEach(deal => {
          allDeals.push({ ...deal, source: section.key });
        });
      }
    });
    return allDeals;
  };

  const getActiveTabData = () => {
    let deals = [];
    if (activeTab === 'all') {
      deals = getAllDeals();
    } else {
      deals = data[activeTab] || [];
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      deals = deals.filter(deal => {
        const title = (deal.title || '').toLowerCase();
        const price = (deal.price || '').toLowerCase();
        return title.includes(query) || price.includes(query);
      });
    }
    
    return deals;
  };

  const getActiveTabCount = () => {
    return getActiveTabData().length;
  };

  return (
    <div className={`app-container ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="app-content">
        <header className="app-header">
          <h1 className="app-title">{isRTL ? 'אוגר הדילים' : 'Deals Aggregator'}</h1>
          <div className="header-controls">
            <div className={`search-container ${isSearchExpanded ? 'expanded' : ''}`}>
              <button
                className="search-icon-btn"
                onClick={() => setIsSearchExpanded(!isSearchExpanded)}
                title={isRTL ? 'חפש' : 'Search'}
              >
                🔍
              </button>
              {isSearchExpanded && (
                <>
                  <input
                    type="text"
                    className="search-input"
                    placeholder={isRTL ? 'חפש דילים...' : 'Search deals...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      className="search-clear"
                      onClick={() => setSearchQuery('')}
                      title={isRTL ? 'נקה' : 'Clear'}
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="view-toggle">
              <button
                className={`view-btn ${viewMode === 'tiles' ? 'active' : ''}`}
                onClick={() => setViewMode('tiles')}
                title="Grid View"
              >
                ⊞
              </button>
              <button
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="List View"
              >
                ☰
              </button>
            </div>
            <button 
              className="toggle-rtl" 
              onClick={() => setIsRTL(!isRTL)}
              title={isRTL ? 'Switch to LTR' : 'Switch to RTL'}
            >
              {isRTL ? '← LTR' : 'RTL →'}
            </button>
            <button 
              className="refresh-btn" 
              onClick={fetchData}
              title={lastUpdated ? `Last updated ${formatTime(lastUpdated)}` : 'Refresh'}
            >
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="error-message">Error: {String(error)}</div>
        )}

        <div className="tabs-container">
          {sections.map((sec) => {
            // Show filtered count if this is the active tab and search is active
            let count;
            if (activeTab === sec.key && searchQuery.trim()) {
              count = getActiveTabData().length;
            } else {
              count = sec.key === 'all' 
                ? getAllDeals().length 
                : (data[sec.key]?.length || 0);
            }
            const displayTitle = (sec.key === 'all' && isRTL && sec.titleRTL) 
              ? sec.titleRTL 
              : sec.title;
            return (
              <button
                key={sec.key}
                className={`tab-button ${activeTab === sec.key ? 'active' : ''}`}
                onClick={() => setActiveTab(sec.key)}
              >
                {displayTitle}
                {count > 0 && (
                  <span className="tab-badge">{count}</span>
                )}
                {activeTab === sec.key && <span className="tab-indicator" />}
              </button>
            );
          })}
        </div>

        <div className="tab-content">
          {loading ? (
            <div className="loading-skeleton">
              <div className="skeleton-item" />
              <div className="skeleton-item" />
              <div className="skeleton-item" />
            </div>
          ) : activeTab !== 'all' && sourceErrors[activeTab] ? (
            <div className="error-box">
              {sourceErrors[activeTab]}
            </div>
          ) : getActiveTabCount() > 0 ? (
            <div className={`deals-grid ${viewMode === 'cards' ? 'cards-view' : 'tiles-view'}`}>
              {getActiveTabData().map((deal, idx) => (
                <Card 
                  key={deal.link || deal.title || `${deal.source || ''}-${idx}`} 
                  deal={deal} 
                  isRTL={isRTL}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="no-deals">
              {isRTL ? 'לא נמצאו דילים כרגע.' : 'No deals found right now.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



