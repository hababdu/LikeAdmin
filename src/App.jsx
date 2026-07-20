import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/admin';
const ADMIN_KEY = 'YOUR_ADMIN_SECRET'; // .env ga o'tkazish tavsiya etiladi

const AdminPanel = () => {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const headers = { 'x-admin-key': ADMIN_KEY };

  // Statistika yuklash
  const loadStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/stats`, { headers });
      if (res.data.success) setStats(res.data.data);
    } catch (err) {
      console.error("Stats xatolik:", err);
    }
  };

  // Foydalanuvchilarni yuklash
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/users`, {
        headers,
        params: { search, page, limit: 30 }
      });
      if (res.data.success) {
        setUsers(res.data.users);
        setTotal(res.data.total);
      }
    } catch (err) {
      alert("Foydalanuvchilarni yuklashda xatolik");
    }
    setLoading(false);
  };

  // Coin qo'shish / ayirish
  const updateCoins = async (id, amount) => {
    if (!amount) return;
    try {
      await axios.post(`${API_BASE}/users/${id}/coins`, { amount: Number(amount) }, { headers });
      loadUsers();
      alert(`${amount > 0 ? 'Qo‘shildi' : 'Ayirildi'}: ${amount} tanga`);
    } catch (err) {
      alert("Coin yangilashda xatolik");
    }
  };

  // Foydalanuvchini o‘chirish
  const deleteUser = async (id) => {
    if (!window.confirm("Haqiqatan ham o‘chirmoqchimisiz?")) return;
    try {
      await axios.delete(`${API_BASE}/users/${id}`, { headers });
      loadUsers();
    } catch (err) {
      alert("O‘chirishda xatolik");
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [search, page]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-indigo-700">
          Like Duel — Admin Panel
        </h1>

        {/* Statistika Kartalari */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Jami O‘yinchilar</h3>
            <p className="text-4xl font-bold">{stats.totalUsers || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Jami Tangalar</h3>
            <p className="text-4xl font-bold text-green-600">{stats.totalCoins?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-gray-500">Top 10 bor</h3>
            <p className="text-4xl font-bold">{stats.top10?.length || 0}</p>
          </div>
        </div>

        {/* Qidiruv */}
        <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-4">
          <input
            type="text"
            placeholder="TgID, Username yoki Ism bo‘yicha qidirish..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={() => setPage(1)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
          >
            Qidirish
          </button>
        </div>

        {/* Foydalanuvchilar Jadvali */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="p-4 text-left">TgID</th>
                <th className="p-4 text-left">Ism</th>
                <th className="p-4 text-left">Username</th>
                <th className="p-4 text-right">Tangalar</th>
                <th className="p-4 text-right">Reyting</th>
                <th className="p-4 text-center">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10">Yuklanmoqda...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10">Ma'lumot topilmadi</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user._id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-mono">{user.tgId}</td>
                    <td className="p-4">{user.firstName}</td>
                    <td className="p-4">{user.username || '-'}</td>
                    <td className="p-4 text-right font-semibold text-green-600">{user.coins}</td>
                    <td className="p-4 text-right font-semibold">{user.rating}</td>
                    <td className="p-4 text-center space-x-2">
                      <button
                        onClick={() => {
                          const amount = prompt("Qancha tanga qo'shish yoki ayirish (manfiy son yozing):");
                          if (amount) updateCoins(user._id, amount);
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                      >
                        Coin
                      </button>
                      <button
                        onClick={() => deleteUser(user._id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-5 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
          >
            Oldingi
          </button>
          <span className="py-2">Sahifa: {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-5 py-2 bg-gray-700 text-white rounded"
          >
            Keyingi
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;