import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [stats, setStats] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats`);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/pending?limit=50`);
      setSuggestions(res.data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
    setLoading(false);
  };

  const approveSuggestion = async (id) => {
    try {
      await axios.post(`${API_BASE}/suggestions/${id}/approve`);
      fetchSuggestions();
      fetchStats();
    } catch (error) {
      console.error('Error approving suggestion:', error);
    }
  };

  const rejectSuggestion = async (id) => {
    try {
      await axios.post(`${API_BASE}/suggestions/${id}/reject`);
      fetchSuggestions();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🔗 Internal Link Tool Dashboard</h1>
        <p>Automated internal linking for SEO</p>
      </header>

      <nav className="navbar">
        <button
          className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('suggestions');
            fetchSuggestions();
          }}
        >
          💡 Suggestions
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-section">
            <h2>Overview Statistics</h2>
            {stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{stats.total_pages}</div>
                  <div className="stat-label">Total Pages</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.crawled_pages}</div>
                  <div className="stat-label">Crawled Pages</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.total_keywords}</div>
                  <div className="stat-label">Keywords Extracted</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.total_relationships}</div>
                  <div className="stat-label">Page Relationships</div>
                </div>
                <div className="stat-card highlight">
                  <div className="stat-number">{stats.pending_suggestions}</div>
                  <div className="stat-label">Pending Suggestions</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.approved_suggestions}</div>
                  <div className="stat-label">Approved Links</div>
                </div>
              </div>
            ) : (
              <p>Loading statistics...</p>
            )}
          </div>
        )}

        {activeTab === 'suggestions' && (
          <div className="suggestions-section">
            <div className="suggestions-header">
              <h2>Link Suggestions ({suggestions.length})</h2>
              <button className="btn-refresh" onClick={fetchSuggestions} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {suggestions.length === 0 && !loading && (
              <div className="empty-state">
                <p>No suggestions available. Run the crawler first!</p>
              </div>
            )}

            <div className="suggestions-list">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-card">
                  <div className="suggestion-content">
                    <h3>
                      <span className="badge">{suggestion.link_type}</span>
                      {suggestion.from_title}
                    </h3>
                    <p className="suggestion-meta">
                      Link to: <strong>{suggestion.to_title}</strong>
                    </p>
                    <p className="anchor-text">
                      Anchor text: <code>{suggestion.anchor_text}</code>
                    </p>
                    <p className="relevance">
                      Relevance Score: <strong>{suggestion.relevance_score}%</strong>
                    </p>
                    <p className="context">{suggestion.suggested_context}</p>
                  </div>
                  <div className="suggestion-actions">
                    <button
                      className="btn btn-approve"
                      onClick={() => approveSuggestion(suggestion.id)}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn btn-reject"
                      onClick={() => rejectSuggestion(suggestion.id)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Internal Link Tool v1.0 | Powered by Node.js & React</p>
      </footer>
    </div>
  );
}

export default App;
