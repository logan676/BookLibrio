import { useState, useEffect } from 'react'
import { useAuth } from '../auth'

interface Stats {
  magazines: { total: number; preprocessed: number }
  ebooks: number
  users: number
  curatedLists: number
}

interface User {
  id: number
  email: string
  username: string
  is_admin: boolean
  created_at: string
}

interface CuratedList {
  id: number
  listType: string
  title: string
  subtitle: string | null
  sourceName: string | null
  sourceLogoUrl: string | null
  year: number | null
  bookCount: number
  isActive: boolean
  isFeatured: boolean
  createdAt: string
  updatedAt: string
}

interface CuratedListItem {
  id: number
  listId: number
  externalTitle: string
  externalAuthor: string
  externalCoverUrl: string | null
  isbn: string | null
  position: number
  editorNote: string | null
}

interface JobStatus {
  [key: string]: {
    running: boolean
    lastRun?: string
  }
}

interface SystemInfo {
  nodeVersion: string
  platform: string
  uptime: number
  memory: {
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  environment: string
  timestamp: string
}

type TabType = 'overview' | 'rankings' | 'jobs' | 'system' | 'users'

export default function AdminDashboard() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Rankings state
  const [curatedLists, setCuratedLists] = useState<CuratedList[]>([])
  const [selectedList, setSelectedList] = useState<CuratedList | null>(null)
  const [listItems, setListItems] = useState<CuratedListItem[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(false)

  // Jobs state
  const [jobs, setJobs] = useState<JobStatus>({})
  const [jobsLoading, setJobsLoading] = useState(false)
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)

  // System state
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [systemLoading, setSystemLoading] = useState(false)

  // Users state
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  // Message state
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const API_BASE = '/api/admin-dashboard'

  useEffect(() => {
    fetchStats()
  }, [token])

  useEffect(() => {
    if (activeTab === 'rankings') fetchCuratedLists()
    if (activeTab === 'jobs') fetchJobs()
    if (activeTab === 'system') fetchSystemInfo()
    if (activeTab === 'users') fetchUsers()
  }, [activeTab])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setStats(await res.json())
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCuratedLists = async () => {
    setRankingsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/curated-lists`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setCuratedLists(await res.json())
    } catch (err) {
      console.error('Failed to fetch curated lists:', err)
    } finally {
      setRankingsLoading(false)
    }
  }

  const fetchListDetail = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/curated-lists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedList(data)
        setListItems(data.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch list detail:', err)
    }
  }

  const toggleListActive = async (list: CuratedList) => {
    try {
      const res = await fetch(`${API_BASE}/curated-lists/${list.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...list, isActive: !list.isActive })
      })
      if (res.ok) {
        showMessage('success', `List ${list.isActive ? 'deactivated' : 'activated'}`)
        fetchCuratedLists()
      }
    } catch (err) {
      showMessage('error', 'Failed to update list')
    }
  }

  const deleteList = async (id: number) => {
    if (!confirm('Are you sure you want to delete this list?')) return
    try {
      const res = await fetch(`${API_BASE}/curated-lists/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showMessage('success', 'List deleted')
        fetchCuratedLists()
        setSelectedList(null)
      }
    } catch (err) {
      showMessage('error', 'Failed to delete list')
    }
  }

  const fetchJobs = async () => {
    setJobsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setJobs(data.data || {})
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err)
    } finally {
      setJobsLoading(false)
    }
  }

  const triggerJob = async (jobName: string) => {
    setTriggeringJob(jobName)
    try {
      const res = await fetch(`${API_BASE}/jobs/${jobName}/trigger`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        showMessage('success', `Job "${jobName}" triggered successfully`)
        setTimeout(fetchJobs, 1000)
      } else {
        showMessage('error', 'Failed to trigger job')
      }
    } catch (err) {
      showMessage('error', 'Failed to trigger job')
    } finally {
      setTriggeringJob(null)
    }
  }

  const fetchSystemInfo = async () => {
    setSystemLoading(true)
    try {
      const res = await fetch(`${API_BASE}/system`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setSystemInfo(await res.json())
    } catch (err) {
      console.error('Failed to fetch system info:', err)
    } finally {
      setSystemLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setUsers(await res.json())
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const toggleUserAdmin = async (user: User) => {
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}/admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isAdmin: !user.is_admin })
      })
      if (res.ok) {
        showMessage('success', `User ${user.is_admin ? 'demoted' : 'promoted'} to ${user.is_admin ? 'regular user' : 'admin'}`)
        fetchUsers()
      }
    } catch (err) {
      showMessage('error', 'Failed to update user')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${mins}m`
  }

  const getListTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nyt_bestseller: 'NYT Bestseller',
      amazon_best: 'Amazon Best',
      bill_gates: 'Bill Gates',
      goodreads_choice: 'Goodreads Choice',
      pulitzer: 'Pulitzer Prize',
      booker: 'Booker Prize',
      obama_reading: 'Obama Reading',
      national_book: 'National Book Award',
    }
    return labels[type] || type
  }

  const jobDescriptions: Record<string, string> = {
    refresh_popular_highlights: 'Refresh popular book highlights',
    aggregate_book_stats: 'Aggregate book statistics',
    enrich_book_metadata: 'Enrich book metadata from external sources',
    compute_related_books: 'Compute related book recommendations',
    cleanup_expired_ai_cache: 'Clean up expired AI cache entries',
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        {message && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'rankings', label: 'Rankings', icon: '📋' },
          { id: 'jobs', label: 'Jobs', icon: '⚙️' },
          { id: 'system', label: 'System', icon: '🖥️' },
          { id: 'users', label: 'Users', icon: '👥' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {loading ? (
              <div className="loading">Loading...</div>
            ) : stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h3>Ebooks</h3>
                    <p className="stat-number">{stats.ebooks.toLocaleString()}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📰</div>
                  <div className="stat-info">
                    <h3>Magazines</h3>
                    <p className="stat-number">{stats.magazines.total.toLocaleString()}</p>
                    <p className="stat-sub">Preprocessed: {stats.magazines.preprocessed}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>Users</h3>
                    <p className="stat-number">{stats.users.toLocaleString()}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📋</div>
                  <div className="stat-info">
                    <h3>Curated Lists</h3>
                    <p className="stat-number">{stats.curatedLists.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && (
          <div className="rankings-tab">
            <div className="rankings-layout">
              {/* List Panel */}
              <div className="rankings-list-panel">
                <div className="panel-header">
                  <h3>External Rankings</h3>
                  <span className="count">{curatedLists.length} lists</span>
                </div>
                {rankingsLoading ? (
                  <div className="loading">Loading...</div>
                ) : (
                  <div className="rankings-list">
                    {curatedLists.map(list => (
                      <div
                        key={list.id}
                        className={`ranking-item ${selectedList?.id === list.id ? 'selected' : ''} ${!list.isActive ? 'inactive' : ''}`}
                        onClick={() => fetchListDetail(list.id)}
                      >
                        <div className="ranking-item-main">
                          <span className="ranking-type">{getListTypeLabel(list.listType)}</span>
                          <h4>{list.title}</h4>
                          <p className="ranking-meta">
                            {list.bookCount} books • {list.year || 'N/A'}
                          </p>
                        </div>
                        <div className="ranking-item-actions">
                          <button
                            className={`status-btn ${list.isActive ? 'active' : 'inactive'}`}
                            onClick={(e) => { e.stopPropagation(); toggleListActive(list) }}
                            title={list.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {list.isActive ? '✓' : '○'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Detail Panel */}
              <div className="rankings-detail-panel">
                {selectedList ? (
                  <>
                    <div className="panel-header">
                      <div>
                        <h3>{selectedList.title}</h3>
                        <p className="subtitle">{selectedList.subtitle}</p>
                      </div>
                      <button
                        className="delete-btn"
                        onClick={() => deleteList(selectedList.id)}
                      >
                        Delete List
                      </button>
                    </div>
                    <div className="list-meta">
                      <span>Source: {selectedList.sourceName || 'Unknown'}</span>
                      <span>Year: {selectedList.year || 'N/A'}</span>
                      <span>Books: {selectedList.bookCount}</span>
                      <span>Status: {selectedList.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="list-items">
                      <h4>Books ({listItems.length})</h4>
                      {listItems.map((item, index) => (
                        <div key={item.id} className="list-item">
                          <span className="item-rank">#{index + 1}</span>
                          {item.externalCoverUrl && (
                            <img src={item.externalCoverUrl} alt="" className="item-cover" />
                          )}
                          <div className="item-info">
                            <h5>{item.externalTitle}</h5>
                            <p>{item.externalAuthor}</p>
                            {item.editorNote && <p className="editor-note">{item.editorNote}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <p>Select a ranking list to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <div className="jobs-tab">
            <div className="panel-header">
              <h3>Background Jobs</h3>
              <button className="refresh-btn" onClick={fetchJobs} disabled={jobsLoading}>
                {jobsLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {jobsLoading && Object.keys(jobs).length === 0 ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="jobs-grid">
                {Object.entries(jobDescriptions).map(([jobName, description]) => {
                  const status = jobs[jobName]
                  return (
                    <div key={jobName} className="job-card">
                      <div className="job-header">
                        <h4>{jobName.replace(/_/g, ' ')}</h4>
                        <span className={`job-status ${status?.running ? 'running' : 'idle'}`}>
                          {status?.running ? 'Running' : 'Idle'}
                        </span>
                      </div>
                      <p className="job-description">{description}</p>
                      {status?.lastRun && (
                        <p className="job-last-run">Last run: {formatDate(status.lastRun)}</p>
                      )}
                      <button
                        className="trigger-btn"
                        onClick={() => triggerJob(jobName)}
                        disabled={triggeringJob === jobName || status?.running}
                      >
                        {triggeringJob === jobName ? 'Triggering...' : 'Trigger Now'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="system-tab">
            <div className="panel-header">
              <h3>System Information</h3>
              <button className="refresh-btn" onClick={fetchSystemInfo} disabled={systemLoading}>
                {systemLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {systemLoading && !systemInfo ? (
              <div className="loading">Loading...</div>
            ) : systemInfo && (
              <div className="system-grid">
                <div className="system-card">
                  <h4>Environment</h4>
                  <div className="system-item">
                    <span>Node Version</span>
                    <strong>{systemInfo.nodeVersion}</strong>
                  </div>
                  <div className="system-item">
                    <span>Platform</span>
                    <strong>{systemInfo.platform}</strong>
                  </div>
                  <div className="system-item">
                    <span>Environment</span>
                    <strong className={systemInfo.environment === 'production' ? 'prod' : 'dev'}>
                      {systemInfo.environment}
                    </strong>
                  </div>
                </div>
                <div className="system-card">
                  <h4>Runtime</h4>
                  <div className="system-item">
                    <span>Uptime</span>
                    <strong>{formatUptime(systemInfo.uptime)}</strong>
                  </div>
                  <div className="system-item">
                    <span>Last Updated</span>
                    <strong>{formatDate(systemInfo.timestamp)}</strong>
                  </div>
                </div>
                <div className="system-card">
                  <h4>Memory Usage</h4>
                  <div className="memory-bar">
                    <div
                      className="memory-used"
                      style={{ width: `${(systemInfo.memory.heapUsed / systemInfo.memory.heapTotal) * 100}%` }}
                    />
                  </div>
                  <div className="system-item">
                    <span>Heap Used</span>
                    <strong>{systemInfo.memory.heapUsed} MB</strong>
                  </div>
                  <div className="system-item">
                    <span>Heap Total</span>
                    <strong>{systemInfo.memory.heapTotal} MB</strong>
                  </div>
                  <div className="system-item">
                    <span>RSS</span>
                    <strong>{systemInfo.memory.rss} MB</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="panel-header">
              <h3>User Management</h3>
              <span className="count">{users.length} users</span>
            </div>
            {usersLoading ? (
              <div className="loading">Loading...</div>
            ) : (
              <div className="users-table">
                <div className="table-header">
                  <span>Email</span>
                  <span>Username</span>
                  <span>Role</span>
                  <span>Joined</span>
                  <span>Actions</span>
                </div>
                {users.map(user => (
                  <div key={user.id} className="table-row">
                    <span className="user-email">{user.email}</span>
                    <span>{user.username}</span>
                    <span>
                      <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </span>
                    <span>{formatDate(user.created_at)}</span>
                    <span>
                      <button
                        className={`action-btn ${user.is_admin ? 'demote' : 'promote'}`}
                        onClick={() => toggleUserAdmin(user)}
                      >
                        {user.is_admin ? 'Demote' : 'Promote'}
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .admin-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          min-height: 100vh;
          background: #f5f7fa;
        }

        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .admin-header h1 {
          font-size: 28px;
          color: #1a1a2e;
          margin: 0;
        }

        .message {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          animation: slideIn 0.3s ease;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Tab Navigation */
        .tab-nav {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: white;
          padding: 8px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .tab-nav .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .tab-nav .tab-btn:hover {
          background: #f0f0f0;
        }

        .tab-nav .tab-btn.active {
          background: #007bff;
          color: white;
        }

        .tab-icon {
          font-size: 18px;
        }

        /* Tab Content */
        .tab-content {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          min-height: 500px;
        }

        .loading {
          text-align: center;
          padding: 40px;
          color: #888;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .panel-header .count {
          font-size: 14px;
          color: #888;
        }

        .refresh-btn {
          padding: 8px 16px;
          background: #f0f0f0;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .refresh-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Overview Tab */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
        }

        .stat-card:nth-child(2) {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .stat-card:nth-child(3) {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        .stat-card:nth-child(4) {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }

        .stat-icon {
          font-size: 40px;
        }

        .stat-info h3 {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 700;
          margin: 4px 0;
        }

        .stat-sub {
          font-size: 12px;
          opacity: 0.8;
          margin: 0;
        }

        /* Rankings Tab */
        .rankings-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 24px;
          height: calc(100vh - 300px);
          min-height: 500px;
        }

        .rankings-list-panel {
          border-right: 1px solid #eee;
          padding-right: 24px;
          overflow-y: auto;
        }

        .rankings-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ranking-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 2px solid transparent;
        }

        .ranking-item:hover {
          background: #f0f0f0;
        }

        .ranking-item.selected {
          border-color: #007bff;
          background: #e7f3ff;
        }

        .ranking-item.inactive {
          opacity: 0.6;
        }

        .ranking-type {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ranking-item h4 {
          margin: 4px 0;
          font-size: 14px;
          color: #333;
        }

        .ranking-meta {
          font-size: 12px;
          color: #666;
          margin: 0;
        }

        .status-btn {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #ddd;
          background: white;
          cursor: pointer;
          font-size: 14px;
        }

        .status-btn.active {
          border-color: #28a745;
          color: #28a745;
        }

        .status-btn.inactive {
          border-color: #dc3545;
          color: #dc3545;
        }

        .rankings-detail-panel {
          overflow-y: auto;
        }

        .subtitle {
          color: #666;
          font-size: 14px;
          margin: 4px 0 0;
        }

        .delete-btn {
          padding: 8px 16px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .delete-btn:hover {
          background: #c82333;
        }

        .list-meta {
          display: flex;
          gap: 16px;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
          font-size: 13px;
          color: #666;
        }

        .list-items {
          margin-top: 20px;
        }

        .list-items h4 {
          margin: 0 0 16px;
          color: #333;
        }

        .list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .item-rank {
          font-weight: 600;
          color: #007bff;
          min-width: 30px;
        }

        .item-cover {
          width: 40px;
          height: 60px;
          object-fit: cover;
          border-radius: 4px;
        }

        .item-info h5 {
          margin: 0;
          font-size: 14px;
          color: #333;
        }

        .item-info p {
          margin: 4px 0 0;
          font-size: 12px;
          color: #666;
        }

        .editor-note {
          font-style: italic;
          color: #888 !important;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          color: #888;
        }

        /* Jobs Tab */
        .jobs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .job-card {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
          border: 1px solid #eee;
        }

        .job-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .job-header h4 {
          margin: 0;
          font-size: 14px;
          color: #333;
          text-transform: capitalize;
        }

        .job-status {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 500;
        }

        .job-status.running {
          background: #cce5ff;
          color: #004085;
        }

        .job-status.idle {
          background: #e2e3e5;
          color: #383d41;
        }

        .job-description {
          font-size: 13px;
          color: #666;
          margin: 0 0 12px;
        }

        .job-last-run {
          font-size: 12px;
          color: #888;
          margin: 0 0 12px;
        }

        .trigger-btn {
          width: 100%;
          padding: 10px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
        }

        .trigger-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .trigger-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        /* System Tab */
        .system-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .system-card {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 10px;
        }

        .system-card h4 {
          margin: 0 0 16px;
          font-size: 14px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .system-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .system-item:last-child {
          border-bottom: none;
        }

        .system-item span {
          color: #666;
          font-size: 13px;
        }

        .system-item strong {
          color: #333;
          font-size: 13px;
        }

        .system-item strong.prod {
          color: #28a745;
        }

        .system-item strong.dev {
          color: #ffc107;
        }

        .memory-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .memory-used {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.3s;
        }

        /* Users Tab */
        .users-table {
          border: 1px solid #eee;
          border-radius: 8px;
          overflow: hidden;
        }

        .table-header, .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 100px 150px 100px;
          padding: 12px 16px;
          align-items: center;
        }

        .table-header {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 13px;
          color: #666;
        }

        .table-row {
          border-top: 1px solid #eee;
          font-size: 13px;
        }

        .table-row:hover {
          background: #f8f9fa;
        }

        .user-email {
          font-weight: 500;
          color: #333;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .role-badge.admin {
          background: #cce5ff;
          color: #004085;
        }

        .role-badge.user {
          background: #e2e3e5;
          color: #383d41;
        }

        .action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .action-btn.promote {
          background: #28a745;
          color: white;
        }

        .action-btn.demote {
          background: #dc3545;
          color: white;
        }

        .action-btn:hover {
          opacity: 0.9;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .rankings-layout {
            grid-template-columns: 1fr;
          }

          .rankings-list-panel {
            border-right: none;
            padding-right: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            max-height: 300px;
          }

          .table-header, .table-row {
            grid-template-columns: 1fr 80px 80px;
          }

          .table-header span:nth-child(2),
          .table-header span:nth-child(4),
          .table-row span:nth-child(2),
          .table-row span:nth-child(4) {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}
