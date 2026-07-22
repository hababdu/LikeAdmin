import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// ============================================================
// ADMIN PANEL - TO'LIQ LOYIHA
// ============================================================

function App() {
  // ======================
  // STATE'LAR
  // ======================
  const [adminKey, setAdminKey] = useState(localStorage.getItem('admin_token') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // ======================
  // KONSTANTALAR
  // ======================
  const API_URL = import.meta.env?.VITE_API_URL || 'https://telegram-bot-server-2-matj.onrender.com';
  const ADMIN_TOKEN = import.meta.env?.VITE_ADMIN_TOKEN || '0000';
  const LIMIT = 20;

  // ======================
  // HEADER FUNKSIYALARI
  // ======================
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
    'Authorization': `Bearer ${adminKey}`
  });

  // ======================
  // API FUNKSIYALARI
  // ======================

  // 1. STATISTIKA
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: getHeaders()
      });
      
      if (res.status === 403) {
        setIsAuthorized(false);
        setError('Admin ruxsati yo\'q. Kalitni tekshiring.');
        localStorage.removeItem('admin_token');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        setError(data.message || 'Statistika yuklashda xatolik');
      }
    } catch (err) {
      console.error('Stats error:', err);
      setError('Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [adminKey, API_URL]);

  // 2. FOYDALANUVCHILAR
  const fetchUsers = useCallback(async (page = currentPage, searchTerm = search, sort = sortBy) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/users?page=${page}&limit=${LIMIT}&search=${encodeURIComponent(searchTerm)}&sortBy=${sort}`,
        { headers: getHeaders() }
      );
      
      if (res.status === 403) {
        setIsAuthorized(false);
        setError('Admin ruxsati yo\'q');
        localStorage.removeItem('admin_token');
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
        setTotalUsers(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setCurrentPage(page);
      } else {
        setError(data.message || 'Foydalanuvchilarni yuklashda xatolik');
      }
    } catch (err) {
      console.error('Users error:', err);
      setError('Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [adminKey, API_URL, currentPage, search, sortBy]);

  // 3. FOYDALANUVCHI YANGILASH
  const updateUser = async (id, data) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (result.success) {
        setSuccessMessage('✅ Foydalanuvchi muvaffaqiyatli yangilandi!');
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchUsers();
        await fetchStats();
        setShowEditModal(false);
        return true;
      } else {
        setError(result.message || 'Yangilashda xatolik');
        return false;
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Server xatoligi');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // 4. COIN QO'SHISH
  const updateCoins = async (id, amount) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/coins`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ amount })
      });
      
      const result = await res.json();
      if (result.success) {
        setSuccessMessage(`🪙 ${amount > 0 ? '+' : ''}${amount} tanga ${amount > 0 ? 'qo\'shildi' : 'ayirildi'}`);
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchUsers();
        await fetchStats();
      } else {
        setError(result.message || 'Coin o\'zgartirishda xatolik');
      }
    } catch (err) {
      console.error('Coins error:', err);
      setError('Server xatoligi');
    } finally {
      setLoading(false);
    }
  };

  // 5. FOYDALANUVCHI O'CHIRISH
  const deleteUser = async (id) => {
    if (!window.confirm('⚠️ Bu amal qaytarib bo\'lmaydi! Foydalanuvchini o\'chirmoqchimisiz?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      
      const result = await res.json();
      if (result.success) {
        setSuccessMessage('🗑️ Foydalanuvchi o\'chirildi');
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchUsers();
        await fetchStats();
      } else {
        setError(result.message || 'O\'chirishda xatolik');
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Server xatoligi');
    } finally {
      setLoading(false);
    }
  };

  // 6. KO'P O'CHIRISH
  const bulkDelete = async () => {
    if (selectedUsers.length === 0) {
      setError('Hech qanday foydalanuvchi tanlanmagan');
      return;
    }
    
    if (!window.confirm(`⚠️ ${selectedUsers.length} ta foydalanuvchini o'chirmoqchimisiz?`)) return;
    
    setLoading(true);
    let deleted = 0;
    for (const id of selectedUsers) {
      try {
        const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
          method: 'DELETE',
          headers: getHeaders()
        });
        const result = await res.json();
        if (result.success) deleted++;
      } catch (err) {
        console.error('Bulk delete error:', err);
      }
    }
    
    setSuccessMessage(`✅ ${deleted} ta foydalanuvchi o'chirildi`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setSelectedUsers([]);
    await fetchUsers();
    await fetchStats();
    setLoading(false);
  };

  // 7. EKSPORT
  const exportUsers = async () => {
    if (users.length === 0) {
      setError('Eksport qilish uchun foydalanuvchilar yo\'q');
      return;
    }
    
    setLoading(true);
    try {
      const headers = ['ID', 'Telegram ID', 'Ism', 'Username', 'Tangalar', 'Reyting', 'O\'yinlar', 'G\'alabalar'];
      const csvData = users.map(u => [
        u._id,
        u.tgId,
        u.firstName,
        u.username || '',
        u.coins,
        u.rating,
        u.totalGames || 0,
        u.wins || 0
      ]);
      
      const csvContent = [headers.join(','), ...csvData.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMessage('📊 Foydalanuvchilar eksport qilindi');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError('Eksportda xatolik');
    } finally {
      setLoading(false);
    }
  };

  // ======================
  // EVENT HANDLER'LAR
  // ======================

  // LOGIN
  const handleLogin = (e) => {
    e.preventDefault();
    if (adminKey.trim()) {
      if (adminKey === ADMIN_TOKEN) {
        localStorage.setItem('admin_token', adminKey);
        setIsAuthorized(true);
        setError(null);
        fetchStats();
        fetchUsers();
      } else {
        setError('❌ Noto\'g\'ri admin kaliti!');
      }
    }
  };

  // QIDIRUV
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setCurrentPage(1);
    fetchUsers(1, value, sortBy);
  };

  // SAHIFA O'ZGARISHI
  const handlePageChange = (page) => {
    fetchUsers(page, search, sortBy);
  };

  // SORT O'ZGARISHI
  const handleSortChange = (e) => {
    const value = e.target.value;
    setSortBy(value);
    setCurrentPage(1);
    fetchUsers(1, search, value);
  };

  // TANLASH
  const toggleSelectUser = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) 
        ? prev.filter(uid => uid !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length && users.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  // TAHRIRLASH MODAL
  const openEditModal = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    
    await updateUser(editingUser._id, {
      firstName: editingUser.firstName,
      username: editingUser.username,
      coins: Number(editingUser.coins),
      rating: Number(editingUser.rating),
      photoUrl: editingUser.photoUrl
    });
  };

  // CHIQISH
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthorized(false);
    setUsers([]);
    setStats(null);
    setAdminKey('');
    setSuccessMessage('👋 Tizimdan chiqdingiz');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ======================
  // EFFECT'LAR
  // ======================
  useEffect(() => {
    if (adminKey && adminKey === ADMIN_TOKEN) {
      setIsAuthorized(true);
      fetchStats();
      fetchUsers();
    }
  }, []);

  // ============================================================
  // LOGIN EKRANI
  // ============================================================
  if (!isAuthorized) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">🔐</div>
            <h2>Admin Tizimiga Kirish</h2>
            <p>Like-Duel boshqaruv paneli</p>
          </div>
          
          {error && (
            <div className="error-message">
              ⚠️ {error}
              <button className="close-btn" onClick={() => setError(null)}>✕</button>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>🔑 Admin Secret Key</label>
              <input 
                type="password" 
                placeholder="Secret keyni kiriting..." 
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="admin-input"
                required
                autoFocus
              />
            </div>
            
            <button type="submit" className="btn-primary btn-block">
              🚪 Kirish
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================
  // ASOSIY PANEL
  // ============================================================
  return (
    <div className="admin-wrapper">
      {/* HEADER */}
      <header className="admin-header">
        <div className="header-left">
          <h1>🛠️ Like-Duel Admin</h1>
          <span className="header-badge">v2.0</span>
        </div>
        <div className="header-right">
          <span className="user-badge">👤 Admin</span>
          <button className="btn-refresh" onClick={() => { fetchStats(); fetchUsers(); }}>
            🔄 Yangilash
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            🚪 Chiqish
          </button>
        </div>
      </header>

      {/* XABARLAR */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          ✅ {successMessage}
          <button className="close-btn" onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Foydalanuvchilar
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📈 Statistika
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Sozlamalar
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: DASHBOARD */}
      {/* ============================================================ */}
      {activeTab === 'dashboard' && (
        <div className="tab-content">
          {/* STATISTIKA KARTALARI */}
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">👥</div>
              <div className="stat-label">Jami O'yinchilar</div>
              <div className="stat-value">{stats?.totalUsers || 0}</div>
              <div className="stat-sub">🟢 Online: {stats?.onlineUsers || 0}</div>
            </div>
            
            <div className="stat-card success">
              <div className="stat-icon">🪙</div>
              <div className="stat-label">Jami Tangalar</div>
              <div className="stat-value">{(stats?.totalCoins || 0).toLocaleString()}</div>
            </div>
            
            <div className="stat-card warning">
              <div className="stat-icon">🏆</div>
              <div className="stat-label">Umumiy Reyting</div>
              <div className="stat-value">{(stats?.totalRating || 0).toLocaleString()}</div>
            </div>
            
            <div className="stat-card info">
              <div className="stat-icon">🎮</div>
              <div className="stat-label">Jami O'yinlar</div>
              <div className="stat-value">{(stats?.totalGames || 0).toLocaleString()}</div>
            </div>
            
            <div className="stat-card purple">
              <div className="stat-icon">🎯</div>
              <div className="stat-label">Faol Xonalar</div>
              <div className="stat-value">{stats?.activeRooms || 0}</div>
            </div>
            
            <div className="stat-card danger">
              <div className="stat-icon">🔍</div>
              <div className="stat-label">Qidiruv Navbati</div>
              <div className="stat-value">{stats?.searchQueue || 0}</div>
            </div>
          </div>

          {/* TOP 10 */}
          {stats?.top10 && stats.top10.length > 0 && (
            <div className="table-container">
              <div className="table-header">
                <h3 className="table-title">🏆 TOP 10 O'yinchilar</h3>
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ism</th>
                      <th>Username</th>
                      <th>🏆 Reyting</th>
                      <th>🪙 Tangalar</th>
                      <th>🎮 O'yinlar</th>
                      <th>🏅 G'alabalar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top10.map((player, index) => (
                      <tr key={player._id || index}>
                        <td>
                          <span className={`rank-${index + 1}`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td>
                          <div className="avatar-cell">
                            <img 
                              src={player.photoUrl || `https://ui-avatars.com/api/?name=${player.firstName}&background=667eea&color=fff`} 
                              alt={player.firstName}
                              onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${player.firstName}&background=667eea&color=fff`}
                            />
                            <span className="user-name">{player.firstName}</span>
                          </div>
                        </td>
                        <td>@{player.username || '—'}</td>
                        <td><strong>{player.rating}</strong></td>
                        <td>🪙 {player.coins}</td>
                        <td>{player.totalGames || 0}</td>
                        <td>
                          <span className="win-rate">
                            {player.wins || 0}
                            {player.totalGames > 0 && (
                              <span className="win-percent">
                                ({Math.round((player.wins || 0) / player.totalGames * 100)}%)
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: FOYDALANUVCHILAR */}
      {/* ============================================================ */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <div className="table-container">
            <div className="table-header">
              <div className="table-search">
                <div className="search-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="Qidirish (ID, Ism yoki Username)..."
                    value={search}
                    onChange={handleSearch}
                    className="search-input"
                  />
                </div>
                <select value={sortBy} onChange={handleSortChange} className="sort-select">
                  <option value="rating">🏆 Reyting bo'yicha</option>
                  <option value="coins">🪙 Tanga bo'yicha</option>
                  <option value="games">🎮 O'yin bo'yicha</option>
                  <option value="newest">🆕 Yangi bo'yicha</option>
                </select>
              </div>
              
              <div className="table-actions">
                {selectedUsers.length > 0 && (
                  <button className="btn-danger" onClick={bulkDelete}>
                    🗑️ O'chirish ({selectedUsers.length})
                  </button>
                )}
                <button className="btn-success" onClick={exportUsers}>
                  📥 Eksport
                </button>
              </div>
            </div>

            <div className="table-responsive">
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
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>Foydalanuvchi</th>
                      <th>Telegram ID</th>
                      <th>🪙 Tangalar</th>
                      <th>🏆 Reyting</th>
                      <th>🎮 O'yinlar</th>
                      <th>📅 Oxirgi faollik</th>
                      <th style={{ width: '180px' }}>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className={selectedUsers.includes(user._id) ? 'selected' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => toggleSelectUser(user._id)}
                          />
                        </td>
                        <td>
                          <div className="avatar-cell">
                            <img
                              src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=667eea&color=fff`}
                              alt={user.firstName}
                              onError={(e) => e.target.src = `https://ui-avatars.com/api/?name=${user.firstName}&background=667eea&color=fff`}
                            />
                            <div>
                              <div className="user-name">{user.firstName}</div>
                              <div className="user-username">@{user.username || 'username yo\'q'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="mono">{user.tgId}</td>
                        <td>
                          <div className="coin-cell">
                            <span className="coin-value">{user.coins}</span>
                            <div className="coin-actions">
                              <button className="btn-plus" onClick={() => updateCoins(user._id, 50)}>+50</button>
                              <button className="btn-minus" onClick={() => updateCoins(user._id, -50)}>-50</button>
                              <button className="btn-plus-big" onClick={() => updateCoins(user._id, 100)}>+100</button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rating-badge">{user.rating}</span>
                        </td>
                        <td>
                          <div>
                            <div>{user.totalGames || 0} o'yin</div>
                            <div className="games-detail">
                              🏅 {user.wins || 0} g'alaba
                              {user.totalGames > 0 && (
                                <span className="win-percent">
                                  ({Math.round((user.wins || 0) / user.totalGames * 100)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="date-cell">
                          {formatDate(user.lastLogin)}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-edit" onClick={() => openEditModal(user)}>
                              ✏️ Tahrirlash
                            </button>
                            <button className="btn-delete" onClick={() => deleteUser(user._id)}>
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(currentPage - 1)} 
                  disabled={currentPage === 1}
                >
                  ⬅️
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = i + 1;
                  if (currentPage > 3 && totalPages > 5) {
                    if (i === 0) pageNum = 1;
                    else if (i === 1) pageNum = currentPage - 1;
                    else if (i === 2) pageNum = currentPage;
                    else if (i === 3) pageNum = currentPage + 1;
                    else if (i === 4) pageNum = totalPages;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`page-btn ${pageNum === currentPage ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button 
                  className="page-btn" 
                  onClick={() => handlePageChange(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                >
                  ➡️
                </button>
                <span className="page-info">
                  {totalUsers} ta foydalanuvchi
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: STATISTIKA */}
      {/* ============================================================ */}
      {activeTab === 'stats' && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card primary">
              <div className="stat-icon">👥</div>
              <div className="stat-label">Jami O'yinchilar</div>
              <div className="stat-value">{stats?.totalUsers || 0}</div>
              <div className="stat-sub">🟢 Online: {stats?.onlineUsers || 0}</div>
            </div>
            
            <div className="stat-card success">
              <div className="stat-icon">🪙</div>
              <div className="stat-label">Jami Tangalar</div>
              <div className="stat-value">{(stats?.totalCoins || 0).toLocaleString()}</div>
            </div>
            
            <div className="stat-card warning">
              <div className="stat-icon">🏆</div>
              <div className="stat-label">Umumiy Reyting</div>
              <div className="stat-value">{(stats?.totalRating || 0).toLocaleString()}</div>
            </div>
            
            <div className="stat-card info">
              <div className="stat-icon">🎮</div>
              <div className="stat-label">Jami O'yinlar</div>
              <div className="stat-value">{(stats?.totalGames || 0).toLocaleString()}</div>
            </div>
          </div>

          {/* Aktivlik */}
          <div className="table-container" style={{ marginTop: '20px' }}>
            <div className="table-header">
              <h3 className="table-title">📊 Aktivlik Ma'lumotlari</h3>
              <span className="update-time">
                🕐 Yangilangan: {new Date().toLocaleTimeString('uz-UZ')}
              </span>
            </div>
            <div className="activity-grid">
              <div className="activity-item">
                <div className="activity-label">Faol Xonalar</div>
                <div className="activity-value">{stats?.activeRooms || 0}</div>
              </div>
              <div className="activity-item">
                <div className="activity-label">Qidiruv Navbati</div>
                <div className="activity-value">{stats?.searchQueue || 0}</div>
              </div>
              <div className="activity-item">
                <div className="activity-label">Online Foydalanuvchilar</div>
                <div className="activity-value" style={{ color: '#48bb78' }}>{stats?.onlineUsers || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: SOZLAMALAR */}
      {/* ============================================================ */}
      {activeTab === 'settings' && (
        <div className="tab-content">
          <div className="table-container">
            <div className="table-header">
              <h3 className="table-title">⚙️ Sozlamalar</h3>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); }} style={{ padding: '24px' }}>
              <div className="form-group">
                <label>📱 Ilova Nomi</label>
                <input
                  type="text"
                  value="Like-Duel Admin"
                  className="admin-input"
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label>🌐 API URL</label>
                <input
                  type="text"
                  value={API_URL}
                  className="admin-input"
                  disabled
                  style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                />
                <small className="form-hint">
                  API URL ni o'zgartirish uchun .env faylini tahrirlang
                </small>
              </div>

              <div className="form-group">
                <label>🔑 Admin Token</label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value);
                    localStorage.setItem('admin_token', e.target.value);
                  }}
                  className="admin-input"
                  placeholder="Admin token..."
                />
                <small className="form-hint">
                  Token o'zgartirilganda qayta kirish talab qilinadi
                </small>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-warning" onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}>
                  🗑️ Keshni Tozalash
                </button>
                <button type="button" className="btn-primary" onClick={() => {
                  setSuccessMessage('✅ Sozlamalar saqlandi');
                  setTimeout(() => setSuccessMessage(null), 3000);
                }}>
                  💾 Saqlash
                </button>
              </div>
            </form>
          </div>

          {/* System Info */}
          <div className="table-container" style={{ marginTop: '20px' }}>
            <div className="table-header">
              <h3 className="table-title">ℹ️ Tizim Ma'lumotlari</h3>
            </div>
            <div className="system-info">
              <div className="info-item">
                <span className="info-label">Versiya</span>
                <span className="info-value">v2.0.0</span>
              </div>
              <div className="info-item">
                <span className="info-label">React Versiya</span>
                <span className="info-value">{React.version}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Environment</span>
                <span className="info-value">{import.meta.env?.MODE || 'production'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Foydalanuvchilar</span>
                <span className="info-value">{stats?.totalUsers || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAHRIRLASH MODAL */}
      {/* ============================================================ */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Foydalanuvchini Tahrirlash</h3>
              <button className="modal-close" onClick={closeEditModal}>✕</button>
            </div>
            
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Ismi *</label>
                  <input
                    type="text"
                    value={editingUser.firstName || ''}
                    onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                    className="admin-input"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                    className="admin-input"
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>🪙 Tangalar *</label>
                    <input
                      type="number"
                      value={editingUser.coins || 0}
                      onChange={(e) => setEditingUser({...editingUser, coins: e.target.value})}
                      className="admin-input"
                      min="0"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>🏆 Reyting *</label>
                    <input
                      type="number"
                      value={editingUser.rating || 0}
                      onChange={(e) => setEditingUser({...editingUser, rating: e.target.value})}
                      className="admin-input"
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Rasm URL</label>
                  <input
                    type="text"
                    value={editingUser.photoUrl || ''}
                    onChange={(e) => setEditingUser({...editingUser, photoUrl: e.target.value})}
                    className="admin-input"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div className="form-group">
                  <label>Telegram ID</label>
                  <input
                    type="text"
                    value={editingUser.tgId || ''}
                    className="admin-input"
                    disabled
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                  <small className="form-hint">Telegram ID o'zgartirib bo'lmaydi</small>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={closeEditModal}>
                  ❌ Bekor qilish
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? '⏳ Saqlanmoqda...' : '💾 Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;