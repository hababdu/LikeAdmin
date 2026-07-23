// ============================================================
// 1. AdminPanel.js - TO'LIQ ADMIN PANEL
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AdminPanel.css';

function AdminPanel({ onBack, user }) {
  // ======================
  // STATE
  // ======================
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('rating');
  const [activeTab, setActiveTab] = useState('users');
  const [adminKey, setAdminKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [socketRooms, setSocketRooms] = useState([]);
  const [searchQueue, setSearchQueue] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  // ======================
  // CONSTANTS
  // ======================
  const BACKEND_URL = process.env.NODE_ENV === 'production'
    ? 'https://telegram-bot-server-2-matj.onrender.com'
    : 'http://localhost:10000';

  const ADMIN_TOKEN = 'admin-secret-key'; // Servernikiga mos kelishi kerak

  // ======================
  // ADMIN AUTHENTICATION
  // ======================
  const handleLogin = useCallback(() => {
    if (adminKey === ADMIN_TOKEN) {
      setIsAuthenticated(true);
      setAuthError('');
      localStorage.setItem('adminToken', adminKey);
      fetchStats();
      fetchUsers();
    } else {
      setAuthError('❌ Noto\'g\'ri admin kalit!');
    }
  }, [adminKey]);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken === ADMIN_TOKEN) {
      setAdminKey(savedToken);
      setIsAuthenticated(true);
      fetchStats();
      fetchUsers();
    }
  }, []);

  // ======================
  // API CALLS
  // ======================
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey
  }), [adminKey]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  }, [BACKEND_URL, getHeaders]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/admin/users?search=${searchTerm}&page=${currentPage}&sortBy=${sortBy}`,
        { headers: getHeaders() }
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setError('Foydalanuvchilarni yuklashda xatolik');
      }
    } catch (error) {
      setError('Serverga ulanishda xatolik');
      console.error('Users fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, getHeaders, searchTerm, currentPage, sortBy]);

  const fetchSocketStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/socket-status`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setSocketRooms(data.data.rooms || []);
        setSearchQueue(data.data.searchQueue || []);
        setOnlineUsers(data.data.onlineUsers || []);
      }
    } catch (error) {
      console.error('Socket status fetch error:', error);
    }
  }, [BACKEND_URL, getHeaders]);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/logs`, {
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data.logs || []);
      }
    } catch (error) {
      console.error('Logs fetch error:', error);
    }
  }, [BACKEND_URL, getHeaders]);

  const updateUser = useCallback(async (userId, updates) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        fetchStats();
        setShowEditModal(false);
        alert('✅ Foydalanuvchi muvaffaqiyatli yangilandi!');
      } else {
        alert('❌ Xatolik: ' + data.message);
      }
    } catch (error) {
      alert('❌ Server xatoligi');
      console.error('Update error:', error);
    }
  }, [BACKEND_URL, getHeaders, fetchUsers, fetchStats]);

  const deleteUser = useCallback(async (userId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        fetchStats();
        setShowDeleteModal(false);
        alert('✅ Foydalanuvchi o\'chirildi!');
      } else {
        alert('❌ Xatolik: ' + data.message);
      }
    } catch (error) {
      alert('❌ Server xatoligi');
      console.error('Delete error:', error);
    }
  }, [BACKEND_URL, getHeaders, fetchUsers, fetchStats]);

  const updateCoins = useCallback(async (userId, amount) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/coins`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount })
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        fetchStats();
        alert('✅ Tangalar yangilandi!');
      } else {
        alert('❌ Xatolik: ' + data.message);
      }
    } catch (error) {
      alert('❌ Server xatoligi');
      console.error('Coins update error:', error);
    }
  }, [BACKEND_URL, getHeaders, fetchUsers, fetchStats]);

  // ======================
  // AUTO REFRESH
  // ======================
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        fetchStats();
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'socket') fetchSocketStatus();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab, fetchStats, fetchUsers, fetchSocketStatus]);

  // ======================
  // FORMAT FUNCTIONS
  // ======================
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('uz-UZ');
  };

  const getRankBadge = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const getStatusBadge = (isOnline) => {
    return isOnline ? '🟢 Online' : '🔴 Offline';
  };

  // ======================
  // ADMIN LOGIN SCREEN
  // ======================
  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <div className="admin-login-header">
            <h2>🔐 Admin Panel</h2>
            <p>Iltimos, admin kalitini kiriting</p>
          </div>
          <div className="admin-login-body">
            <input
              type="password"
              className="admin-input"
              placeholder="Admin kalitini kiriting..."
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            {authError && <div className="admin-error">{authError}</div>}
            <button className="admin-btn admin-btn-primary" onClick={handleLogin}>
              Kirish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ======================
  // EDIT MODAL
  // ======================
  const EditModal = () => {
    if (!showEditModal || !editingUser) return null;

    const [formData, setFormData] = useState({
      firstName: editingUser.firstName || '',
      username: editingUser.username || '',
      coins: editingUser.coins || 0,
      rating: editingUser.rating || 0,
      photoUrl: editingUser.photoUrl || ''
    });

    const handleSubmit = () => {
      updateUser(editingUser._id, formData);
    };

    return (
      <div className="admin-modal-overlay" onClick={() => setShowEditModal(false)}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h3>✏️ Foydalanuvchini Tahrirlash</h3>
            <button className="admin-modal-close" onClick={() => setShowEditModal(false)}>✕</button>
          </div>
          <div className="admin-modal-body">
            <div className="form-group">
              <label>Ism</label>
              <input
                type="text"
                className="admin-input"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                className="admin-input"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tangalar</label>
              <input
                type="number"
                className="admin-input"
                value={formData.coins}
                onChange={(e) => setFormData({ ...formData, coins: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Reyting (XP)</label>
              <input
                type="number"
                className="admin-input"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Rasm URL</label>
              <input
                type="text"
                className="admin-input"
                value={formData.photoUrl}
                onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="admin-modal-footer">
            <button className="admin-btn admin-btn-secondary" onClick={() => setShowEditModal(false)}>
              Bekor qilish
            </button>
            <button className="admin-btn admin-btn-primary" onClick={handleSubmit}>
              Saqlash
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ======================
  // DELETE MODAL
  // ======================
  const DeleteModal = () => {
    if (!showDeleteModal || !selectedUser) return null;

    return (
      <div className="admin-modal-overlay" onClick={() => setShowDeleteModal(false)}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-modal-header">
            <h3>⚠️ Foydalanuvchini O'chirish</h3>
            <button className="admin-modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
          </div>
          <div className="admin-modal-body">
            <p>
              <strong>{selectedUser.firstName}</strong> ({selectedUser.tgId}) foydalanuvchini o'chirmoqchimisiz?
            </p>
            <p className="admin-warning">Bu amal qaytarib bo'lmaydi!</p>
          </div>
          <div className="admin-modal-footer">
            <button className="admin-btn admin-btn-secondary" onClick={() => setShowDeleteModal(false)}>
              Bekor qilish
            </button>
            <button className="admin-btn admin-btn-danger" onClick={() => deleteUser(selectedUser._id)}>
              O'chirish
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ======================
  // STATS CARDS
  // ======================
  const StatsCards = () => {
    if (!stats) return null;

    return (
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalUsers || 0}</span>
            <span className="stat-label">Jami Foydalanuvchilar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-info">
            <span className="stat-value">{stats.onlineUsers || 0}</span>
            <span className="stat-label">Online Foydalanuvchilar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🪙</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalCoins || 0}</span>
            <span className="stat-label">Jami Tangalar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalRating || 0}</span>
            <span className="stat-label">Jami XP</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalGames || 0}</span>
            <span className="stat-label">Jami O'yinlar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🏠</div>
          <div className="stat-info">
            <span className="stat-value">{stats.activeRooms || 0}</span>
            <span className="stat-label">Faol Xonalar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-info">
            <span className="stat-value">{stats.searchQueue || 0}</span>
            <span className="stat-label">Navbatdagilar</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="stat-value">{stats.top10?.length || 0}</span>
            <span className="stat-label">TOP 10</span>
          </div>
        </div>
      </div>
    );
  };

  // ======================
  // TOP 10 LIST
  // ======================
  const Top10List = () => {
    if (!stats?.top10) return null;

    return (
      <div className="top10-container">
        <h3>🏆 TOP 10 Peshqadamlar</h3>
        <div className="top10-list">
          {stats.top10.map((player, index) => (
            <div key={player.tgId || index} className="top10-item">
              <span className="top10-rank">{getRankBadge(index)}</span>
              <span className="top10-name">{player.firstName}</span>
              <span className="top10-coins">🪙 {player.coins}</span>
              <span className="top10-rating">🏆 {player.rating}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ======================
  // USERS TABLE
  // ======================
  const UsersTable = () => (
    <div className="users-table-container">
      <div className="table-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Foydalanuvchi qidirish..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="admin-input"
          />
        </div>
        <div className="sort-select">
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="admin-select"
          >
            <option value="rating">🏆 Reyting</option>
            <option value="coins">🪙 Tangalar</option>
            <option value="games">🎮 O'yinlar</option>
            <option value="newest">🆕 Yangi</option>
          </select>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={fetchUsers}>
          🔄 Yangilash
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Yuklanmoqda...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <p>📭 Foydalanuvchilar topilmadi</p>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Foydalanuvchi</th>
                  <th>🪙 Tanga</th>
                  <th>🏆 XP</th>
                  <th>🎮 O'yin</th>
                  <th>🏅 G'alaba</th>
                  <th>📊 Win Rate</th>
                  <th>Status</th>
                  <th>So'nggi faol</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user._id}>
                    <td>{((currentPage - 1) * 20) + index + 1}</td>
                    <td>
                      <div className="user-cell">
                        <img
                          src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=667eea&color=fff`}
                          alt={user.firstName}
                          className="user-avatar"
                          onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${user.firstName}&background=667eea&color=fff`}
                        />
                        <div className="user-info">
                          <span className="user-name">{user.firstName}</span>
                          {user.username && <span className="user-username">@{user.username}</span>}
                          <span className="user-id">ID: {user.tgId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">{user.coins}</td>
                    <td className="text-center">{user.rating}</td>
                    <td className="text-center">{user.totalGames || 0}</td>
                    <td className="text-center">{user.wins || 0}</td>
                    <td className="text-center">
                      {user.totalGames > 0 ? Math.round((user.wins / user.totalGames) * 100) : 0}%
                    </td>
                    <td className="text-center">
                      <span className={`status-badge ${user.isOnline ? 'online' : 'offline'}`}>
                        {user.isOnline ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </td>
                    <td className="text-center">{formatDate(user.lastLogin)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn edit-btn"
                          onClick={() => {
                            setEditingUser(user);
                            setShowEditModal(true);
                          }}
                          title="Tahrirlash"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn coin-btn"
                          onClick={() => {
                            const amount = prompt('Nechta tanga qo\'shish/ayirish? (masalan: 50 yoki -30)');
                            if (amount !== null) {
                              updateCoins(user._id, parseInt(amount) || 0);
                            }
                          }}
                          title="Tangalarni o'zgartirish"
                        >
                          🪙
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          title="O'chirish"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ⬅️
              </button>
              <span className="page-info">
                {currentPage} / {totalPages}
              </span>
              <button
                className="page-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                ➡️
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ======================
  // SOCKET STATUS
  // ======================
  const SocketStatus = () => (
    <div className="socket-status-container">
      <div className="socket-stats">
        <div className="socket-stat">
          <span className="label">🔌 Faol xonalar:</span>
          <span className="value">{socketRooms.length}</span>
        </div>
        <div className="socket-stat">
          <span className="label">🔍 Navbatdagilar:</span>
          <span className="value">{searchQueue.length}</span>
        </div>
        <div className="socket-stat">
          <span className="label">🟢 Online:</span>
          <span className="value">{onlineUsers.length}</span>
        </div>
      </div>

      {onlineUsers.length > 0 && (
        <div className="online-users-list">
          <h4>🟢 Online Foydalanuvchilar</h4>
          <div className="online-users-grid">
            {onlineUsers.map((user, index) => (
              <div key={index} className="online-user">
                <span className="user-name">{user.firstName}</span>
                <span className="user-rating">🏆 {user.rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {socketRooms.length > 0 && (
        <div className="active-rooms-list">
          <h4>🏠 Faol Xonalar</h4>
          {socketRooms.map((room, index) => (
            <div key={index} className="room-item">
              <span className="room-id">{room.roomId}</span>
              <span className="room-players">
                {room.players?.map(p => p.name).join(' vs ')}
              </span>
              <span className="room-stake">🪙 {room.stake}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ======================
  // LOGS
  // ======================
  const LogsView = () => (
    <div className="logs-container">
      <div className="logs-header">
        <h3>📋 Server Loglar</h3>
        <button className="admin-btn admin-btn-secondary" onClick={fetchLogs}>
          🔄 Yangilash
        </button>
      </div>
      <div className="logs-list">
        {logs.map((log, index) => (
          <div key={index} className="log-item">
            <span className="log-time">{formatDate(log.timestamp)}</span>
            <span className={`log-level ${log.level}`}>{log.level}</span>
            <span className="log-message">{log.message}</span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="empty-state">
            <p>📭 Hech qanday log topilmadi</p>
          </div>
        )}
      </div>
    </div>
  );

  // ======================
  // MAIN RENDER
  // ======================
  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <button className="back-btn" onClick={onBack}>
            ⬅️ Bosh sahifa
          </button>
          <h1>⚙️ Admin Panel</h1>
        </div>
        <div className="admin-header-right">
          <span className="admin-user">👤 {user?.firstName || 'Admin'}</span>
          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => {
              localStorage.removeItem('adminToken');
              setIsAuthenticated(false);
              setAdminKey('');
            }}
          >
            🚪 Chiqish
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Foydalanuvchilar
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('stats');
            fetchStats();
          }}
        >
          📊 Statistika
        </button>
        <button
          className={`tab-btn ${activeTab === 'socket' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('socket');
            fetchSocketStatus();
          }}
        >
          🔌 Socket Status
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('logs');
            fetchLogs();
          }}
        >
          📋 Loglar
        </button>
      </div>

      {/* Content */}
      <div className="admin-content">
        {error && (
          <div className="admin-error-banner">
            ⚠️ {error}
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {activeTab === 'stats' && (
          <>
            <StatsCards />
            <Top10List />
          </>
        )}

        {activeTab === 'users' && <UsersTable />}

        {activeTab === 'socket' && <SocketStatus />}

        {activeTab === 'logs' && <LogsView />}
      </div>

      {/* Modals */}
      <EditModal />
      <DeleteModal />
    </div>
  );
}

export default AdminPanel;