import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pin, setPin] = useState('');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalCoins: 0 });
  const [loading, setLoading] = useState(false);
  
  // Tahrirlash holatlari
  const [editingUser, setEditingUser] = useState(null);
  const [newCoins, setNewCoins] = useState(0);
  const [newRating, setNewRating] = useState(0);

  const BACKEND_URL = "https://telegram-bot-server-2-matj.onrender.com";
  const ADMIN_PIN = "2026"; 

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const fetchData = () => {
    setLoading(true);
    fetch(`${BACKEND_URL}/api/admin/users`, {
      headers: { 'X-Admin-Token': ADMIN_PIN }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(data.users);
          const totalCoins = data.users.reduce((sum, u) => sum + (u.coins || 0), 0);
          setStats({ totalUsers: data.users.length, totalCoins: totalCoins });
        }
      })
      .catch(err => console.error("Ma'lumot yuklashda xatolik:", err))
      .finally(() => setLoading(false));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAdmin(true);
    } else {
      alert("⚠️ Maxfiy PIN-kod noto'g'ri!");
      setPin('');
    }
  };

  const startEdit = (player) => {
    setEditingUser(player);
    setNewCoins(player.coins);
    setNewRating(player.rating);
  };

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
        alert("✅ Foydalanuvchi ma'lumotlari muvaffaqiyatli yangilandi!");
        setUsers(users.map(u => u.tgId === editingUser.tgId ? { ...u, coins: Number(newCoins), rating: Number(newRating) } : u));
        setEditingUser(null);
        // Umumiy statistikani qayta hisoblash
        const updatedUsers = users.map(u => u.tgId === editingUser.tgId ? { ...u, coins: Number(newCoins), rating: Number(newRating) } : u);
        setStats({
          totalUsers: updatedUsers.length,
          totalCoins: updatedUsers.reduce((sum, u) => sum + (u.coins || 0), 0)
        });
      } else {
        alert("Server o'zgarishni rad etdi.");
      }
    })
    .catch(() => alert("Serverga ulanish xatosi!"));
  };

  // 🔐 1. LOGIN SCREEN
  if (!isAdmin) {
    return (
      <div className="admin-login-container">
        <div className="login-card">
          <div className="lock-icon">🔐</div>
          <h2>Like-Duel Admin</h2>
          <p>Tizimga kirish uchun PIN-kodni kiriting</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              maxLength="6" 
              placeholder="••••" 
              value={pin} 
              onChange={(e) => setPin(e.target.value)} 
              autoFocus
            />
            <button type="submit" className="btn btn-login">Kirish</button>
          </form>
        </div>
      </div>
    );
  }

  // 📊 2. MAIN DASHBOARD SCREEN
  return (
    <div className="admin-dashboard">
      {/* Navbar */}
      <header className="dashboard-nav">
        <div className="nav-brand">💥 Like-Duel Control Panel ⚙️</div>
        <button className="btn btn-logout" onClick={() => setIsAdmin(false)}>🔒 Tizimdan Chiqish</button>
      </header>

      <main className="dashboard-content">
        {/* Analytics Cards */}
        <section className="stats-grid">
          <div className="card-stat">
            <div className="stat-icon-box bg-blue">👥</div>
            <div className="stat-info">
              <h3>{stats.totalUsers} ta</h3>
              <p>Jami Ro'yxatdan O'tganlar</p>
            </div>
          </div>
          <div className="card-stat">
            <div className="stat-icon-box bg-gold">🪙</div>
            <div className="stat-info">
              <h3>{stats.totalCoins.toLocaleString()}</h3>
              <p>Tizimdagi Jami Tangalar</p>
            </div>
          </div>
        </section>

        {/* Modal Editor */}
        {editingUser && (
          <div className="modal-backdrop">
            <div className="modal-box">
              <h3>✏️ O'yinchi Balansini Tahrirlash</h3>
              <div className="user-meta">
                <span>Ismi: <strong>{editingUser.firstName}</strong></span>
                <span>ID: <code>{editingUser.tgId}</code></span>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="input-field">
                  <label>🪙 O'yin Tangalari (Coins):</label>
                  <input type="number" value={newCoins} onChange={(e) => setNewCoins(e.target.value)} />
                </div>
                <div className="input-field">
                  <label>🏆 Tajriba Ochkosi (XP / Rating):</label>
                  <input type="number" value={newRating} onChange={(e) => setNewRating(e.target.value)} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-cancel" onClick={() => setEditingUser(null)}>Bekor qilish</button>
                  <button type="submit" className="btn btn-save">Saqlash</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Data Table */}
        <section className="data-table-section">
          <div className="section-header">
            <h3>Foydalanuvchilar Ro'yxati</h3>
            <button className="btn btn-refresh" onClick={fetchData}>🔄 Yangilash</button>
          </div>

          {loading ? (
            <div className="table-loader">Ma'lumotlar yuklanmoqda, kuting...</div>
          ) : (
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Foydalanuvchi</th>
                    <th>Telegram Username</th>
                    <th>🪙 Tangalar</th>
                    <th>🏆 XP / Rating</th>
                    <th>Harakat</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.tgId}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar-lbl">🕹️</span>
                          <div>
                            <div className="user-cell-name">{user.firstName}</div>
                            <small className="user-cell-id">ID: {user.tgId}</small>
                          </div>
                        </div>
                      </td>
                      <td>{user.username ? `@${user.username}` : <span className="no-data">mavjud emas</span>}</td>
                      <td className="txt-gold font-bold">🪙 {user.coins}</td>
                      <td className="txt-green font-bold">{user.rating} XP</td>
                      <td>
                        <button className="btn btn-table-edit" onClick={() => startEdit(user)}>✏️ Tahrirlash</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="empty-table-msg">Hozircha o'yinchilar bazada mavjud emas.</p>}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;