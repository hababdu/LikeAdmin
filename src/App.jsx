import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function AdminPanel({ onBack }) {
  // ======================
  // STATE'LAR
  // ======================
  const [adminKey, setAdminKey] = useState(localStorage.getItem('admin_secret') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [sortBy, setSortBy] = useState('rating');
  const [selectedUsers, setSelectedUsers] = useState([]);

  // ======================
  // KONSTANTALAR
  // ======================
  const BACKEND_URL = process.env.REACT_APP_API_URL || 'https://telegram-bot-server-2-matj.onrender.com';
  const LIMIT = 20;

  // ======================
  // HEADER FUNKSIYALARI
  // ======================
  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-key': adminKey,
    'Authorization': `Bearer ${adminKey}`
  });

  // ======================
  // API CALL FUNKSIYALARI
  // ======================

  // 1. STATISTIKA
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/stats`, {
        headers: getAuthHeaders()
      });
      
      if (res.status === 403) {
        setIsAuthorized(false);
        setError('Admin ruxsati yo\'q. Kalitni tekshiring.');
        return;
      }

      const result = await res.json();
      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError(result.message || 'Statistika yuklashda xatolik');
      }
    } catch (err) {
      console.error('Stats xatoligi:', err);
      setError('Serverga ulanishda xatolik');
    }
  }, [adminKey, BACKEND_URL]);

  // 2. FOYDALANUVCHILAR
  const fetchUsers = useCallback(async (currentPage = page, currentSearch = search, currentSort = sortBy) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/admin/users?page=${currentPage}&limit=${LIMIT}&search=${encodeURIComponent(currentSearch)}&sortBy=${currentSort}`,
        { headers: getAuthHeaders() }
      );
      
      if (res.status === 403) {
        setIsAuthorized(false);
        setError('Admin ruxsati yo\'q');
        setLoading(false);
        return;
      }

      const result = await res.json();
      if (result.success) {
        setUsers(result.users || []);
        setTotalUsers(result.total || 0);
      } else {
        setError(result.message || 'Foydalanuvchilarni yuklashda xatolik');
      }
    } catch (err) {
      console.error('Users xatoligi:', err);
      setError('Serverga ulanishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [adminKey, page, search, sortBy, BACKEND_URL, LIMIT]);

  // 3. FOYDALANUVCHI YANGILASH
  const updateUser = async (userId, data) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      if (result.success) {
        setUsers(users.map(u => u._id === userId ? result.user : u));
        setSuccessMessage('Foydalanuvchi muvaffaqiyatli yangilandi!');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchStats();
        return true;
      } else {
        setError(result.message || 'Yangilashda xatolik');
        return false;
      }
    } catch (err) {
      console.error('Update xatoligi:', err);
      setError('Server xatoligi');
      return false;
    }
  };

  // 4. COIN QO'SHISH/AYRISH
  const handleQuickCoin = async (userId, amount) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}/coins`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ amount })
      });
      
      const result = await res.json();
      if (result.success) {
        setUsers(users.map(u => u._id === userId ? { ...u, coins: result.user.coins } : u));
        setSuccessMessage(`🪙 ${amount > 0 ? '+' : ''}${amount} tanga ${amount > 0 ? 'qo\'shildi' : 'ayirildi'}!`);
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchStats();
      } else {
        setError(result.message || 'Coin o\'zgartirishda xatolik');
      }
    } catch (err) {
      console.error('Coin xatoligi:', err);
      setError('Server xatoligi');
    }
  };

  // 5. FOYDALANUVCHI O'CHIRISH
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('⚠️ Bu amal qaytarib bo\'lmaydi! Foydalanuvchini o\'chirmoqchimisiz?')) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      const result = await res.json();
      if (result.success) {
        setUsers(users.filter(u => u._id !== userId));
        setTotalUsers(prev => prev - 1);
        setSuccessMessage('Foydalanuvchi o\'chirildi!');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchStats();
      } else {
        setError(result.message || 'O\'chirishda xatolik');
      }
    } catch (err) {
      console.error('Delete xatoligi:', err);
      setError('Server xatoligi');
    }
  };

  // 6. KO'P FOYDALANUVCHINI O'CHIRISH
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) {
      setError('Hech qanday foydalanuvchi tanlanmagan');
      return;
    }
    
    if (!window.confirm(`⚠️ ${selectedUsers.length} ta foydalanuvchini o'chirmoqchimisiz?`)) return;
    
    let deleted = 0;
    for (const userId of selectedUsers) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        const result = await res.json();
        if (result.success) deleted++;
      } catch (err) {
        console.error('Bulk delete xatoligi:', err);
      }
    }
    
    setSuccessMessage(`✅ ${deleted} ta foydalanuvchi o'chirildi!`);
    setTimeout(() => setSuccessMessage(null), 3000);
    setSelectedUsers([]);
    fetchUsers();
    fetchStats();
  };

  // 7. EXPORT USERLAR (CSV)
  const exportUsers = () => {
    if (users.length === 0) {
      setError('Eksport qilish uchun foydalanuvchilar yo\'q');
      return;
    }
    
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
    setSuccessMessage('📊 Foydalanuvchilar eksport qilindi!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ======================
  // EVENT HANDLER'LAR
  // ======================

  // Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (adminKey.trim()) {
      localStorage.setItem('admin_secret', adminKey);
      setIsAuthorized(true);
      fetchStats();
      fetchUsers();
    }
  };

  // Qidiruv
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearch(value);
    setPage(1);
    fetchUsers(1, value);
  };

  // Sahifa o'zgarishi
  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchUsers(newPage, search);
  };

  // Tanlash
  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u._id));
    }
  };

  // Modal oynani yopish
  const closeModal = () => {
    setEditingUser(null);
    setError(null);
  };

  // ======================
  // EFFECT'LAR
  // ======================

  useEffect(() => {
    if (adminKey) {
      setIsAuthorized(true);
      fetchStats();
      fetchUsers();
    }
  }, [adminKey, fetchStats, fetchUsers]);

  // ======================
  // LOGIN EKRANI
  // ======================
  if (!isAuthorized) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="login-header">
            <span className="login-icon">🔐</span>
            <h2>Admin Tizimiga Kirish</h2>
            <p className="login-subtitle">Like-Duel boshqaruv paneli</p>
          </div>
          
          {error && (
            <div className="admin-error-message">
              ⚠️ {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Admin Secret Key</label>
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
            
            <div className="login-actions">
              <button type="submit" className="admin-btn btn-primary btn-block">
                🔓 Kirish
              </button>
              <button type="button" className="admin-btn btn-secondary btn-block" onClick={onBack}>
                ⬅️ Orqaga
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ======================
  // ASOSIY PANEL
  // ======================
  const totalPages = Math.ceil(totalUsers / LIMIT);

  return (
    <div className="admin-panel-wrapper">
      {/* HEADER */}
      <header className="admin-header">
        <div className="header-left">
          <h1>🛠️ Like-Duel Admin</h1>
          <span className="header-badge">v2.0</span>
        </div>
        <div className="header-right">
          <button className="admin-btn btn-refresh" onClick={() => { fetchStats(); fetchUsers(); }}>
            🔄 Yangilash
          </button>
          <button className="admin-btn btn-danger" onClick={() => { 
            localStorage.removeItem('admin_secret'); 
            setIsAuthorized(false);
            setUsers([]);
            setStats(null);
          }}>
            🚪 Chiqish
          </button>
        </div>
      </header>

      {/* XATOLIK VA MUVAFFAQIYAT XABARLARI */}
      {error && (
        <div className="admin-error-message">
          ⚠️ {error}
          <button className="close-btn" onClick={() => setError(null)}>✕</button>
        </div>
      )}
      
      {successMessage && (
        <div className="admin-success-message">
          ✅ {successMessage}
          <button className="close-btn" onClick={() => setSuccessMessage(null)}>✕</button>
        </div>
      )}

      {/* STATISTIKA */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="stat-box stat-box-primary">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Jami O'yinchilar</h3>
              <p>{stats.totalUsers || 0}</p>
              <span className="stat-sub">Online: {stats.onlineUsers || 0}</span>
            </div>
          </div>
          
          <div className="stat-box stat-box-success">
            <div className="stat-icon">🪙</div>
            <div className="stat-content">
              <h3>Jami Tangalar</h3>
              <p>{stats.totalCoins?.toLocaleString() || 0}</p>
            </div>
          </div>
          
          <div className="stat-box stat-box-warning">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <h3>Umumiy Reyting</h3>
              <p>{stats.totalRating?.toLocaleString() || 0}</p>
            </div>
          </div>
          
          <div className="stat-box stat-box-info">
            <div className="stat-icon">🎮</div>
            <div className="stat-content">
              <h3>Jami O'yinlar</h3>
              <p>{stats.totalGames?.toLocaleString() || 0}</p>
            </div>
          </div>
          
          <div className="stat-box stat-box-purple">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <h3>Faol Xonalar</h3>
              <p>{stats.activeRooms || 0}</p>
            </div>
          </div>
          
          <div className="stat-box stat-box-pink">
            <div className="stat-icon">🔍</div>
            <div className="stat-content">
              <h3>Qidiruv Navbati</h3>
              <p>{stats.searchQueue || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* TOP 10 O'YINCHILAR */}
      {stats?.top10 && stats.top10.length > 0 && (
        <div className="admin-top10">
          <h3>🏆 TOP 10 O'yinchilar</h3>
          <div className="top10-list">
            {stats.top10.map((player, index) => (
              <div key={player._id || index} className="top10-item">
                <span className="top10-rank">#{index + 1}</span>
                <span className="top10-name">{player.firstName}</span>
                <span className="top10-username">@{player.username || 'no username'}</span>
                <span className="top10-stats">🏆 {player.rating} XP</span>
                <span className="top10-coins">🪙 {player.coins}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BOSHQARUV */}
      <div className="admin-controls">
        <div className="controls-left">
          <input 
            type="text" 
            placeholder="🔍 ID, Ism yoki Username..." 
            value={search}
            onChange={handleSearch}
            className="admin-search-input"
          />
          <select 
            value={sortBy} 
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
              fetchUsers(1, search, e.target.value);
            }}
            className="admin-select"
          >
            <option value="rating">🏆 Reyting bo'yicha</option>
            <option value="coins">🪙 Tanga bo'yicha</option>
            <option value="games">🎮 O'yin bo'yicha</option>
            <option value="newest">🆕 Yangi bo'yicha</option>
          </select>
        </div>
        
        <div className="controls-right">
          <button className="admin-btn btn-success" onClick={exportUsers}>
            📥 Eksport
          </button>
          {selectedUsers.length > 0 && (
            <button className="admin-btn btn-danger" onClick={handleBulkDelete}>
              🗑️ O'chirish ({selectedUsers.length})
            </button>
          )}
        </div>
      </div>

      {/* USERLAR JADVALI */}
      <div className="admin-table-container">
        {loading ? (
          <div className="admin-loader">
            <div className="loader-spinner"></div>
            <p>Yuklanmoqda...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <p>📭 Foydalanuvchilar topilmadi</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={{ width: '50px' }}>Avatar</th>
                  <th>Ism / Username</th>
                  <th>Telegram ID</th>
                  <th style={{ width: '120px' }}>🪙 Tangalar</th>
                  <th style={{ width: '100px' }}>🏆 Reyting</th>
                  <th style={{ width: '120px' }}>🎮 O'yinlar</th>
                  <th style={{ width: '180px' }}>⚙️ Operatsiyalar</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id} className={selectedUsers.includes(u._id) ? 'selected' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedUsers.includes(u._id)}
                        onChange={() => toggleSelectUser(u._id)}
                      />
                    </td>
                    <td>
                      <img 
                        src={u.photoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.firstName) + '&background=random'} 
                        alt="avatar" 
                        className="admin-avatar" 
                        onError={(e) => {
                          e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.firstName) + '&background=random';
                        }}
                      />
                    </td>
                    <td>
                      <div className="user-info-cell">
                        <strong>{u.firstName}</strong>
                        <span className="username-sub">{u.username ? `@${u.username}` : '🚫'}</span>
                      </div>
                    </td>
                    <td className="mono">{u.tgId}</td>
                    <td>
                      <div className="coin-cell">
                        <span className="coin-value">{u.coins}</span>
                        <div className="quick-actions">
                          <button 
                            onClick={() => handleQuickCoin(u._id, 50)} 
                            className="btn-q plus"
                            title="+50 tanga"
                          >
                            +50
                          </button>
                          <button 
                            onClick={() => handleQuickCoin(u._id, -50)} 
                            className="btn-q minus"
                            title="-50 tanga"
                          >
                            -50
                          </button>
                          <button 
                            onClick={() => handleQuickCoin(u._id, 100)} 
                            className="btn-q plus-big"
                            title="+100 tanga"
                          >
                            +100
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="rating-badge">{u.rating}</span>
                    </td>
                    <td>
                      <div className="games-stats">
                        <span title="Jami o'yinlar">🎮 {u.totalGames || 0}</span>
                        <span title="G'alabalar">🏅 {u.wins || 0}</span>
                        <span title="G'alaba foizi">
                          {u.totalGames > 0 ? `${Math.round((u.wins || 0) / u.totalGames * 100)}%` : '0%'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="action-cell-btns">
                        <button 
                          className="admin-btn-action edit" 
                          onClick={() => setEditingUser(u)}
                          title="Tahrirlash"
                        >
                          ✏️
                        </button>
                        <button 
                          className="admin-btn-action delete" 
                          onClick={() => handleDeleteUser(u._id)}
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
        )}
      </div>

      {/* SAHIFALASH */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <button 
            className="page-btn" 
            disabled={page === 1} 
            onClick={() => handlePageChange(page - 1)}
          >
            ⬅️ Oldingi
          </button>
          
          <div className="page-numbers">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum = i + 1;
              if (page > 3 && totalPages > 5) {
                if (i === 0) pageNum = 1;
                else if (i === 1) pageNum = page - 1;
                else if (i === 2) pageNum = page;
                else if (i === 3) pageNum = page + 1;
                else if (i === 4) pageNum = totalPages;
              }
              if (i === 1 && page > 3 && totalPages > 5) {
                return <span key="ellipsis1" className="page-ellipsis">...</span>;
              }
              if (i === 3 && page < totalPages - 2 && totalPages > 5) {
                return <span key="ellipsis2" className="page-ellipsis">...</span>;
              }
              return (
                <button 
                  key={pageNum}
                  className={`page-btn ${pageNum === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          
          <button 
            className="page-btn" 
            disabled={page === totalPages} 
            onClick={() => handlePageChange(page + 1)}
          >
            Keyingi ➡️
          </button>
        </div>
      )}

      {/* TAHRIRLASH MODAL */}
      {editingUser && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Foydalanuvchini Tahrirlash</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const success = await updateUser(editingUser._id, {
                firstName: editingUser.firstName,
                username: editingUser.username,
                coins: Number(editingUser.coins),
                rating: Number(editingUser.rating),
                photoUrl: editingUser.photoUrl
              });
              if (success) closeModal();
            }}>
              <div className="form-group">
                <label>Ismi *</label>
                <input 
                  type="text" 
                  value={editingUser.firstName || ''} 
                  onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} 
                  className="admin-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  value={editingUser.username || ''} 
                  onChange={e => setEditingUser({...editingUser, username: e.target.value})} 
                  className="admin-input"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Tangalar *</label>
                  <input 
                    type="number" 
                    value={editingUser.coins || 0} 
                    onChange={e => setEditingUser({...editingUser, coins: e.target.value})} 
                    className="admin-input"
                    min="0"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Reyting (XP) *</label>
                  <input 
                    type="number" 
                    value={editingUser.rating || 0} 
                    onChange={e => setEditingUser({...editingUser, rating: e.target.value})} 
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
                  onChange={e => setEditingUser({...editingUser, photoUrl: e.target.value})} 
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
              
              <div className="modal-buttons">
                <button type="submit" className="admin-btn btn-primary">
                  💾 Saqlash
                </button>
                <button type="button" className="admin-btn btn-secondary" onClick={closeModal}>
                  ❌ Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;