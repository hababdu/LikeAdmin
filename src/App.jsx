import React, { useState, useEffect } from 'react';
import { Users, Coins, Trash2, Edit3, Plus, Search, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import './App.css'; // Stillar uchun pastdagi CSS kodi

function App() {
  const [stats, setStats] = useState({ totalUsers: 0, totalCoins: 0 });
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ id: '', tgId: '', firstName: '', username: '', coins: 100, rating: 100 });
  const [isEditing, setIsEditing] = useState(false);

  // 🛰️ Render'dagi backend loyihangiz manzili
  const API_BASE = "https://telegram-bot-server-2-matj.onrender.com/api/admin";

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Bir vaqtning o'zida statistika va ro'yxatni yuklash
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE}/stats`),
        fetch(`${API_BASE}/users`)
      ]);

      if (!statsRes.ok || !usersRes.ok) throw new Error("Serverdan ma'lumot olishda xatolik!");

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (statsData.success) setStats({ totalUsers: statsData.totalUsers, totalCoins: statsData.totalCoins });
      if (usersData.success) setUsers(usersData.users);
    } catch (err) {
      setError("Server bilan aloqa o'rnatib bo'lmadi. Backend ishlayotganini tekshiring.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name === 'coins' || name === 'rating' ? Number(value) : value 
    });
  };

  // ➕/✏️ Create va Update amali
  const handleSubmit = async (e) => {
    e.preventDefault();
    const url = isEditing ? `${API_BASE}/users/${formData.id}` : `${API_BASE}/users`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        alert(isEditing ? "O'yinchi yangilandi! ✨" : "Yangi o'yinchi qo'shildi! 🚀");
        resetForm();
        loadAdminData();
      } else {
        alert(`Xatolik: ${data.message}`);
      }
    } catch (err) {
      alert("Amalni bajarishda xatolik yuz berdi.");
    }
  };

  // Tahrirlashni boshlash
  const startEdit = (user) => {
    setIsEditing(true);
    setFormData({
      id: user._id,
      tgId: user.tgId,
      firstName: user.firstName,
      username: user.username || '',
      coins: user.coins,
      rating: user.rating
    });
  };

  // ❌ O'chirish (Delete amali)
  const deleteUser = async (id) => {
    if (!window.confirm("Ushbu o'yinchini o'chirishni tasdiqlaysizmi?")) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        loadAdminData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("O'chirishda xatolik bo'ldi.");
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setFormData({ id: '', tgId: '', firstName: '', username: '', coins: 100, rating: 100 });
  };

  const filteredUsers = users.filter(u => 
    (u.firstName && u.firstName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (u.tgId && u.tgId.includes(searchQuery)) ||
    (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-app">
      {/* Sidebar / Left Panel */}
      <aside className="sidebar">
        <div className="logo-zone">
          <div className="avatar-crown">👑</div>
          <div>
            <h2>Like-Duel</h2>
            <span>Global HQ Panel</span>
          </div>
        </div>
        
        <nav className="side-nav">
          <div className="nav-item active"><Users size={18} /> O'yinchilar</div>
          <button className="refresh-btn" onClick={loadAdminData}><RefreshCw size={16} /> Ma'lumotlarni yangilash</button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="main-header">
          <h1>Tizim Boshqaruvi</h1>
          <div className="connection-status">
            <span className="indicator status-online"></span> Serverga ulangan
          </div>
        </header>

        {error && (
          <div className="error-card">
            <ShieldAlert size={20} />
            <p>{error}</p>
            <button onClick={loadAdminData}>Qayta ulanish</button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Xavfsiz aloqa kanali orqali ma'lumotlar yuklanmoqda...</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {/* 📊 Stat kartalari */}
            <div className="stats-container">
              <div className="stat-box">
                <div className="icon-wrap blue"><Users size={24} /></div>
                <div>
                  <h3>Jami Ro'yxat</h3>
                  <p>{stats.totalUsers} ta o'yinchi</p>
                </div>
              </div>
              <div className="stat-box">
                <div className="icon-wrap gold"><Coins size={24} /></div>
                <div>
                  <h3>Umumiy Tangalar</h3>
                  <p className="coin-text">🪙 {stats.totalCoins.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* 📝 Forma bloki */}
            <div className="form-card">
              <h2>{isEditing ? "✏️ O'yinchini Tahrirlash" : "➕ Yangi O'yinchi Qo'shish"}</h2>
              <form onSubmit={handleSubmit} className="crud-form">
                <div className="input-field">
                  <label>Telegram ID</label>
                  <input type="text" name="tgId" value={formData.tgId} onChange={handleInputChange} disabled={isEditing} placeholder="Masalan: 8492042" required />
                </div>
                <div className="input-field">
                  <label>Ismi (First Name)</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Ism kiriting" required />
                </div>
                <div className="input-field">
                  <label>Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleInputChange} placeholder="Sarlavhasiz (ixtiyoriy)" />
                </div>
                <div className="input-field">
                  <label>Tangalar</label>
                  <input type="number" name="coins" value={formData.coins} onChange={handleInputChange} required />
                </div>
                <div className="input-field">
                  <label>Reyting (XP)</label>
                  <input type="number" name="rating" value={formData.rating} onChange={handleInputChange} required />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">{isEditing ? "O'zgarishlarni saqlash" : "O'yinchini yaratish"}</button>
                  {isEditing && <button type="button" className="btn-cancel" onClick={resetForm}>Bekor qilish</button>}
                </div>
              </form>
            </div>

            {/* 👥 Jadval / Ro'yxat */}
            <div className="table-card">
              <div className="table-header">
                <h2>O'yinchilar ro'yxati ({filteredUsers.length})</h2>
                <div className="search-box">
                  <Search size={16} />
                  <input type="text" placeholder="Ism, ID yoki username bo'yicha qidiruv..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>

              <div className="scroll-table">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Telegram ID</th>
                      <th>O'yinchi</th>
                      <th>Username</th>
                      <th>Tangalar</th>
                      <th>Reyting</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-row">Mos keladigan o'yinchi topilmadi.</td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
                        <tr key={u._id}>
                          <td><code>{u.tgId}</code></td>
                          <td>
                            <div className="user-profile-cell">
                              {u.photoUrl ? <img src={u.photoUrl} alt="avatar" className="table-avatar" /> : <div className="table-no-avatar">{u.firstName[0]}</div>}
                              <strong>{u.firstName}</strong>
                            </div>
                          </td>
                          <td>{u.username ? `@${u.username}` : <span className="no-data">yo'q</span>}</td>
                          <td className="gold-text">🪙 {u.coins?.toLocaleString()}</td>
                          <td className="xp-text">🏆 {u.rating} XP</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-edit" onClick={() => startEdit(u)} title="Tahrirlash"><Edit3 size={14} /></button>
                              <button className="btn-delete" onClick={() => deleteUser(u._id)} title="O'chirish"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;