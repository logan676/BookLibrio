import { useState, useEffect } from 'react'
import { useAuth } from '../auth'

interface Stats {
  magazines: { total: number; preprocessed: number }
  ebooks: number
  users: number
}

interface ImportProgress {
  running: boolean
  type: string
  current: number
  total: number
  currentItem: string
  errors: string[]
}

interface BrowseResult {
  currentPath: string
  parentPath: string | null
  folders: { name: string; path: string }[]
}

interface User {
  id: number
  email: string
  is_admin: number
  created_at: string
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [importType, setImportType] = useState<'magazine' | 'ebook'>('magazine')
  const [folderPath, setFolderPath] = useState('')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Folder browser state
  const [showBrowser, setShowBrowser] = useState(false)
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null)
  const [browseLoading, setBrowseLoading] = useState(false)

  // User list state
  const [showUserList, setShowUserList] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [token])

  useEffect(() => {
    let interval: number | undefined
    if (importing) {
      interval = window.setInterval(fetchProgress, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [importing])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setStats(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  const fetchProgress = async () => {
    try {
      const res = await fetch('/api/admin/import/progress', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProgress(data)
        if (!data.running && importing) {
          setImporting(false)
          setMessage('Import completed!')
          fetchStats()
        }
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    }
  }

  const browseFolders = async (path?: string) => {
    setBrowseLoading(true)
    try {
      const url = path ? `/api/admin/browse?path=${encodeURIComponent(path)}` : '/api/admin/browse'
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setBrowseData(await res.json())
      }
    } catch (err) {
      console.error('Failed to browse folders:', err)
    } finally {
      setBrowseLoading(false)
    }
  }

  const openBrowser = () => {
    setShowBrowser(true)
    browseFolders()
  }

  const selectFolder = (path: string) => {
    setFolderPath(path)
    setShowBrowser(false)
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setUsersLoading(false)
    }
  }

  const openUserList = () => {
    setShowUserList(true)
    fetchUsers()
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


  const handleImport = async () => {
    if (!folderPath.trim()) {
      setError('Please enter a folder path')
      return
    }

    setError('')
    setMessage('')
    setImporting(true)

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: importType, folderPath: folderPath.trim() })
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Import failed')
        setImporting(false)
      } else {
        setMessage(data.message)
      }
    } catch (err) {
      setError('Network error')
      setImporting(false)
    }
  }

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      {/* Stats Section */}
      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <h3>Magazines</h3>
            <p className="stat-number">{stats.magazines.total}</p>
            <p className="stat-sub">Preprocessed: {stats.magazines.preprocessed}</p>
          </div>
          <div className="stat-card">
            <h3>Ebooks</h3>
            <p className="stat-number">{stats.ebooks}</p>
          </div>
          <div className="stat-card clickable" onClick={openUserList}>
            <h3>Users</h3>
            <p className="stat-number">{stats.users}</p>
            <p className="stat-hint">Click to view</p>
          </div>
        </div>
      )}

      {/* Import Section */}
      <div className="admin-import-section">
        <h3>Import Content</h3>

        <div className="import-form">
          <div className="form-group">
            <label>Content Type</label>
            <div className="type-selector">
              <button
                className={`type-btn ${importType === 'magazine' ? 'active' : ''}`}
                onClick={() => setImportType('magazine')}
                disabled={importing}
              >
                Magazine (PDF)
              </button>
              <button
                className={`type-btn ${importType === 'ebook' ? 'active' : ''}`}
                onClick={() => setImportType('ebook')}
                disabled={importing}
              >
                Ebook (PDF/EPUB)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Folder Path</label>
            <div className="path-input-row">
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/Volumes/..."
                disabled={importing}
              />
              <button
                className="browse-btn"
                onClick={openBrowser}
                disabled={importing}
              >
                Browse
              </button>
            </div>
          </div>

          {error && <p className="error-message">{error}</p>}
          {message && <p className="success-message">{message}</p>}

          <button
            className="import-btn"
            onClick={handleImport}
            disabled={importing || !folderPath.trim()}
          >
            {importing ? 'Importing...' : 'Start Import'}
          </button>
        </div>

        {/* Progress */}
        {progress && progress.running && (
          <div className="import-progress">
            <div className="progress-header">
              <span>Importing {progress.type}s...</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="current-item">{progress.currentItem}</p>
            {progress.errors.length > 0 && (
              <div className="progress-errors">
                <p>Errors: {progress.errors.length}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Folder Browser Modal */}
      {showBrowser && (
        <div className="browser-overlay" onClick={() => setShowBrowser(false)}>
          <div className="browser-modal" onClick={(e) => e.stopPropagation()}>
            <div className="browser-header">
              <h3>Select Folder</h3>
              <button className="close-btn" onClick={() => setShowBrowser(false)}>x</button>
            </div>

            {browseData && (
              <div className="browser-path">
                <span>{browseData.currentPath}</span>
                <button
                  className="select-current-btn"
                  onClick={() => selectFolder(browseData.currentPath)}
                >
                  Select This Folder
                </button>
              </div>
            )}

            <div className="browser-content">
              {browseLoading ? (
                <div className="browser-loading">Loading...</div>
              ) : browseData ? (
                <div className="folder-list">
                  {browseData.parentPath && (
                    <div
                      className="folder-item parent"
                      onClick={() => browseFolders(browseData.parentPath!)}
                    >
                      <span className="folder-icon">..</span>
                      <span className="folder-name">Parent Directory</span>
                    </div>
                  )}
                  {browseData.folders.map((folder) => (
                    <div
                      key={folder.path}
                      className="folder-item"
                      onClick={() => browseFolders(folder.path)}
                      onDoubleClick={() => selectFolder(folder.path)}
                    >
                      <span className="folder-icon">📁</span>
                      <span className="folder-name">{folder.name}</span>
                    </div>
                  ))}
                  {browseData.folders.length === 0 && !browseData.parentPath && (
                    <div className="no-folders">No folders found</div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="browser-footer">
              <p className="browser-hint">Click to enter folder, double-click to select</p>
            </div>
          </div>
        </div>
      )}

      {/* User List Modal */}
      {showUserList && (
        <div className="browser-overlay" onClick={() => setShowUserList(false)}>
          <div className="browser-modal user-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="browser-header">
              <h3>Users ({users.length})</h3>
              <button className="close-btn" onClick={() => setShowUserList(false)}>x</button>
            </div>

            <div className="browser-content">
              {usersLoading ? (
                <div className="browser-loading">Loading...</div>
              ) : (
                <div className="user-list">
                  {users.map((user) => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <span className="user-email">{user.email}</span>
                        {user.is_admin === 1 && <span className="admin-badge">Admin</span>}
                      </div>
                      <span className="user-date">{formatDate(user.created_at)}</span>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="no-folders">No users found</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-dashboard {
          padding: 20px;
          max-width: 900px;
          margin: 0 auto;
        }

        .admin-dashboard h2 {
          margin-bottom: 24px;
          color: #333;
        }

        .admin-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .stat-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }

        .stat-card h3 {
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }

        .stat-number {
          font-size: 32px;
          font-weight: 600;
          color: #333;
        }

        .stat-sub {
          font-size: 12px;
          color: #888;
          margin-top: 4px;
        }

        .admin-import-section {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 24px;
        }

        .admin-import-section h3 {
          margin-bottom: 20px;
          color: #333;
        }

        .import-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #555;
        }

        .type-selector {
          display: flex;
          gap: 8px;
        }

        .type-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid #e0e0e0;
          background: #fff;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .type-btn:hover:not(:disabled) {
          border-color: #007bff;
        }

        .type-btn.active {
          border-color: #007bff;
          background: #e7f3ff;
          color: #007bff;
        }

        .type-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .path-input-row {
          display: flex;
          gap: 8px;
        }

        .path-input-row input[type="text"] {
          flex: 1;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
        }

        .path-input-row input:focus {
          outline: none;
          border-color: #007bff;
        }

        .browse-btn {
          padding: 12px 20px;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          white-space: nowrap;
        }

        .browse-btn:hover:not(:disabled) {
          background: #5a6268;
        }

        .browse-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .import-btn {
          padding: 14px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .import-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .import-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          color: #dc3545;
          font-size: 14px;
        }

        .success-message {
          color: #28a745;
          font-size: 14px;
        }

        .import-progress {
          margin-top: 20px;
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
          color: #555;
        }

        .progress-bar {
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #007bff;
          transition: width 0.3s;
        }

        .current-item {
          margin-top: 8px;
          font-size: 12px;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .progress-errors {
          margin-top: 8px;
          font-size: 12px;
          color: #dc3545;
        }

        /* Folder Browser Modal */
        .browser-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .browser-modal {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .browser-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .browser-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }

        .close-btn:hover {
          color: #333;
        }

        .browser-path {
          padding: 12px 20px;
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .browser-path span {
          font-size: 13px;
          color: #555;
          font-family: monospace;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .select-current-btn {
          padding: 6px 12px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .select-current-btn:hover {
          background: #218838;
        }

        .browser-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .browser-loading {
          padding: 40px;
          text-align: center;
          color: #888;
        }

        .folder-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .folder-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .folder-item:hover {
          background: #f0f0f0;
        }

        .folder-item.parent {
          color: #666;
        }

        .folder-icon {
          font-size: 18px;
        }

        .folder-name {
          font-size: 14px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .no-folders {
          padding: 40px;
          text-align: center;
          color: #888;
        }

        .browser-footer {
          padding: 12px 20px;
          border-top: 1px solid #e0e0e0;
          background: #f8f9fa;
        }

        .browser-hint {
          margin: 0;
          font-size: 12px;
          color: #888;
          text-align: center;
        }

        /* Clickable stat card */
        .stat-card.clickable {
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card.clickable:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .stat-hint {
          font-size: 11px;
          color: #007bff;
          margin-top: 4px;
        }

        /* User list styles */
        .user-list-modal {
          max-width: 500px;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .user-item:hover {
          background: #f0f0f0;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-email {
          font-size: 14px;
          color: #333;
        }

        .admin-badge {
          font-size: 10px;
          padding: 2px 6px;
          background: #007bff;
          color: white;
          border-radius: 4px;
          font-weight: 500;
        }

        .user-date {
          font-size: 12px;
          color: #888;
        }
      `}</style>
    </div>
  )
}
