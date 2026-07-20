import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

function AdminPanel({ onBack }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalCoins: 0 });
  const [loading, setLoading] = useState(false);
  
  // Tahrirlash moduli uchun state
  const [editingUser, setEditingUser] = useState(null);
  const [newCoins, setNewCoins] = useState(0);
  const [newRating, setNewRating] = useState(0);

  const BACKEND_URL = "https://telegram-bot-server-2-matj.onrender.com";
  const ADMIN_PIN = "2026"; // 🔒 Bu yerga o'zingizning maxfiy parolingizni yozing

  // Admin tasdiqlangandan keyin ma'lumotlarni serverdan tortish
  useEffect(() => {
    if (!isAdmin) return;
    
    setLoading(true);
    // 1. Barcha foydalanuvchilarni olish
    fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { 'X-Admin-Token': ADMIN_PIN }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.users);
          
          // Umumiy statistikani hisoblash
          const totalCoins = data.users.reduce((sum, u) => sum + (u.coins || 0), 0);
          setStats({
            totalUsers: data.users.length,
            totalCoins: totalCoins
          });
        }
      })
      .catch(err => console.error("Admin ma'lumot yuklashda xato:", err))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  // Pin kodni tekshirish
  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
    } else {
      alert("⚠️ Noto'g'ri maxfiy PIN kod!");
      setPin('');
    }
  };

  // O'yinchi ma'lumotlarini o'zgartirish (Serverga saqlash)
  const handleUpdateUser = (e) => {
    e.preventDefault();
    if (!editingUser) return;

    fetch(`${BACKEND_URL}/api/admin/update-user`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Admin-Token': ADMIN_PIN
      },
      body: JSON.stringify({
        tgId: editingUser.tgId,
        coins: Number(newCoins),
        rating: Number(newRating)
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("✅ O'yinchi balansi muvaffaqiyatli yangilandi!");
        // Mahalliy stateni yangilash
        setUsers(users.map(u => u.tgId === editingUser.tgId ? { ...u, coins: Number(newCoins), rating: Number(newRating) } : u));
        setEditingUser(null);
      } else {
        alert("Xatolik: Server yangilashni rad etdi.");
      }
    })
    .catch(err => alert("Serverga ulanishda xatolik yuz berdi."));
  };

  // O'yinchini tahrirlash rejimiga o'tkazish
  const startEdit = (player) => {
    setEditingUser(player);
    setNewCoins(player.coins);
    setNewRating(player.rating);
  };

  // 🚪 PIN KOD SO'RASH EKRANI
  if (!isAdmin) {
    return (
      <div className="admin-login-screen">
        <div className="login-box">
          <h2>🔐 Admin Tizimi</h2>
          <p>Davom etish uchun maxfiy PIN kodni kiriting:</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              maxLength="6"
              placeholder="••••" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <div className="login-actions">
              <button type="button" className="btn-secondary" onClick={onBack}>Orqaga</button>
              <button type="submit" className="btn-primary">Kirish</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-screen">
      {/* Header */}
      <div className="admin-header">
        <button className="back-btn-small" onClick={onBack}>⬅️</button>
        <h2>📊 Boshqaruv Paneli</h2>
        <button className="logout-btn" onClick={() => setIsAdmin(false)}>Chiqish</button>
      </div>

      {/* Statistika Bloklari */}
      <div className="admin-stats-row">
        <div className="stat-card">
          <span className="stat-title">Jami O'yinchilar</span>
          <span className="stat-number">👥 {stats.totalUsers} ta</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">Tizimdagi Jami Tangalar</span>
          <span className="stat-number">🪙 {stats.totalCoins}</span>
        </div>
      </div>

      {/* O'yinchini tahrirlash Modal oynasi (Agar tanlangan bo'lsa) */}
      {editingUser && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h3>📝 Balansni Tahrirlash</h3>
            <p>O'yinchi: <strong>{editingUser.firstName}</strong> (@{editingUser.username || 'yoq'})</p>
            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label>🪙 Tangalar miqdori:</label>
                <input type="number" value={newCoins} onChange={(e) => setNewCoins(e.target.value)} />
              </div>
              <div className="form-group">
                <label>🏆 Reyting XP miqdori:</label>
                <input type="number" value={newRating} onChange={(e) => setNewRating(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Bekor qilish</button>
                <button type="submit" className="btn-primary">Saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* O'yinchilar Ro'yxati Jadvali */}
      <h3>Foydalanuvchilar Ro'yxati</h3>
      {loading ? (
        <p className="loading-text">Yuklanmoqda...</p>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Foydalanuvchi</th>
                <th>🪙 Tangalar</th>
                <th>🏆 XP</th>
                <th>Boshqaruv</th>
              </tr>
            </thead>
            <tbody>
              {users.map(player => (
                <tr key={player.tgId}>
                  <td>
                    <div className="table-user-info">
                      <span className="t-name">{player.firstName}</span>
                      <span className="t-id">ID: {player.tgId}</span>
                    </div>
                  </td>
                  <td className="t-coins">🪙 {player.coins}</td>
                  <td className="t-xp">{player.rating} XP</td>
                  <td>
                    <button className="btn-edit-small" onClick={() => startEdit(player)}>✏️ Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminPanel;