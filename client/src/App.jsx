import React, { useEffect, useMemo, useState } from 'react';
import Card from './components/Card';

const DEFAULT_DATA = { deal4real: [], zuzu: [], buywithus: [] };

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceErrors, setSourceErrors] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

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
      const url = `${apiBase}/scrape?sources=deal4real,zuzu,buywithus`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Check for empty arrays which might indicate errors
      const newData = {
        deal4real: Array.isArray(json.deal4real) ? json.deal4real : [],
        zuzu: Array.isArray(json.zuzu) ? json.zuzu : [],
        buywithus: Array.isArray(json.buywithus) ? json.buywithus : [],
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
    { key: 'deal4real', title: 'Deal4Real' },
    { key: 'zuzu', title: 'Zuzu Deals' },
    { key: 'buywithus', title: 'BuyWithUs' },
  ];

  const formatTime = (d) => {
    if (!d) return '-';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Deals Aggregator</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>Last updated {formatTime(lastUpdated)}</span>
          <button onClick={fetchData} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff' }}>
            Refresh
          </button>
        </div>
      </header>

      {error && (
        <div style={{ marginTop: 12, color: '#b91c1c' }}>Error: {String(error)}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginTop: 16 }}>
        {sections.map((sec) => (
          <section key={sec.key}>
            <h2 style={{ fontSize: 16, margin: '8px 0' }}>{sec.title}</h2>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                <div style={{ height: 60, background: '#f3f4f6', borderRadius: 8 }} />
                <div style={{ height: 60, background: '#f3f4f6', borderRadius: 8 }} />
                <div style={{ height: 60, background: '#f3f4f6', borderRadius: 8 }} />
              </div>
            ) : sourceErrors[sec.key] ? (
              <div style={{ color: '#dc2626', padding: 8, background: '#fef2f2', borderRadius: 6 }}>
                {sourceErrors[sec.key]}
              </div>
            ) : data[sec.key]?.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {data[sec.key].map((deal, idx) => (
                  <Card key={deal.link || deal.title || idx} deal={deal} />
                ))}
              </div>
            ) : (
              <div style={{ color: '#6b7280' }}>No deals found right now.</div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}



