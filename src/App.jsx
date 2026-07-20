import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

function AdminPanel({ onBack }) {
  const [stats, setStats] = useState({ totalUsers: 0, totalCoins: 0 });
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State (Qo'shish va Tahrirlash uchun)
  const [formData, setFormData] = useState({ id: '', tgId: '', firstName: '', username: '', coins: 100, rating: 100 });
  const [isEditing, setIsEditing] = useState(false);

  const API_BASE = "https://telegram-bot-server-2-matj.onrender.com/api/admin";

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      const data = await res.json();
      if (data.success) setStats({ totalUsers: data.totalUsers, totalCoins: data.totalCoins });
    } catch (err) { console.error(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) { console.error(err); }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 📝 O'yinchi Qo'shish yoki Yangilash (Save / Update)
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
        alert(isEditing ? "O'yinchi yangilandi!" : "Yangi o'yinchi qo'shildi!");
        resetForm();
        fetchStats();
        fetchUsers();
      } else {
        alert(data.message || "Xatolik yuz berdi");
      }
    } catch (err) { console.error(err); }
  };

  // ✏️ Tahrirlash rejimiga o'tish
  const startEdit = (user) => {
    setIsEditing(true);
    setFormData({
      id: user._id,
      tgId: user.tgId,
      firstName: user.firstName,
      username: user.username,
      coins: user.coins,
      rating: user.rating
    });
  };

  // ❌ O'yinchini o'chirish (Delete)
  const deleteUser = async (id) => {
    if (!window.confirm("Haqiqatan ham bu o'yinchini o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchStats();
        fetchUsers();
      }
    } catch (err) { console.error(err); }
  };

  const resetForm = () => {
    setIsEditing(false);
    setFormData({ id: '', tgId: '', firstName: '', username: '', coins: 100, rating: 100 });
  };

  // Qidiruv filtri
  const filteredUsers = users.filter(u => 
    u.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.tgId.includes(searchQuery)
  );

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <h2>👑 Like-Duel Nazorat Paneli</h2>
        <button className="admin-back-btn" onClick={onBack}>Chiqish 🚪</button>
      </div>

      {/* 📊 STATISTIKA BLOKI */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <h3>Jami O'yinchilar</h3>
          <p className="stat-number">👥 {stats.totalUsers} ta</p>
        </div>
        <div className="admin-stat-card">
          <h3>Muomaladagi Jami Tangalar</h3>
          <p className="stat-number score-coins">🪙 {stats.totalCoins}</p>
        </div>
      </div>

      {/* 📝 CRUD FORM (QO'SHISH VA TAHRIRLASH) */}
      <div className="admin-crud-section">
        <h3>{isEditing ? "✏️ O'yinchini Tahrirlash" : "➕ Yangi O'yinchi Qo'shish"}</h3>
        <form onSubmit={handleSubmit} className="admin-form">
          <input type="text" name="tgId" placeholder="Telegram ID" value={formData.tgId} onChange={handleInputChange} disabled={isEditing} required />
          <input type="text" name="firstName" placeholder="Ismi" value={formData.firstName} onChange={handleInputChange} required />
          <input type="text" name="username" placeholder="Username (ixtiyoriy)" value={formData.username} onChange={handleInputChange} />
          <input type="number" name="coins" placeholder="Tangalar" value={formData.coins} onChange={handleInputChange} required />
          <input type="number" name="rating" placeholder="Reyting (XP)" value={formData.rating} onChange={handleInputChange} required />
          
          <div className="form-buttons">
            <button type="submit" className="form-submit-btn">{isEditing ? "Yangilash" : "Qo'shish"}</button>
            {isEditing && <button type="button" className="form-cancel-btn" onClick={resetForm}>Bekor qilish</button>}
          </div>
        </form>
      </div>

      {/* 👥 O'YINCHILAR RO'YXATI TABLE */}
      <div className="admin-list-section">
        <div className="list-header-row">
          <h3>O'yinchilar Ro'yxati ({filteredUsers.length})</h3>
          <input type="text" placeholder="Ism yoki TG ID bo'yicha qidirish..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="admin-search-input" />
        </div>

        <div className="table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>TG ID</th>
                <th>Ism</th>
                <th>Username</th>
                <th>Tangalar</th>
                <th>Reyting</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u._id}>
                  <td><code>{u.tgId}</code></td>
                  <td>{u.firstName}</td>
                  <td>{u.username ? `@${u.username}` : 'Yoq'}</td>
                  <td className="coins-cell">🪙 {u.coins}</td>
                  <td>🏆 {u.rating} XP</td>
                  <td>
                    <button className="action-edit-btn" onClick={() => startEdit(u)}>✏️</button>
                    <button className="action-delete-btn" onClick={() => deleteUser(u._id)}>❌</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;