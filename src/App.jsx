import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Konfigurasi API Laravel
const apiLokal = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true
});

const App = () => {
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    fetchPublicMovies();
    checkLogin();
  }, []);

  // 1. Ambil Data API Luar (Kriteria UAS 1a & 1b)
  const fetchPublicMovies = async () => {
    try {
      const res = await axios.get('https://api.themoviedb.org/3/movie/popular?api_key=df8f98c61aa31d142e54f777305b7461');
      setMovies(res.data.results);
    } catch (err) {
      console.log("TMDB Error, Pakai Data Dummy");
      setMovies([
        { id: 1, title: 'Iron Man (Dummy)', poster_path: '/7WsyChvgywbsTUi0Yv0Pbww9RQA.jpg' },
        { id: 2, title: 'Avenger (Dummy)', poster_path: '/RYMX2SABCOxyZ7v76UofQCU7vi.jpg' },
        { id: 3, title: 'Spiderman (Dummy)', poster_path: '/ldfCF9RhR40mppHXmH0mIn98vFp.jpg' }
      ]);
    }
  };

  const checkLogin = async () => {
    try {
      const res = await apiLokal.get('/api/user');
      setUser(res.data);
      setView('dashboard');
      fetchFavorites();
    } catch (e) { setUser(null); }
  };

  const handleAuth = async (e, type) => {
    e.preventDefault();
    try {
      await apiLokal.get('/sanctum/csrf-cookie');
      const url = type === 'register' ? '/register' : '/login';
      await apiLokal.post(url, formData);
      checkLogin();
    } catch (err) {
      alert("Gagal! Cek koneksi backend Laravel kamu.");
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await apiLokal.get('/api/movies');
      setFavorites(res.data);
    } catch (e) { console.log("Gagal ambil koleksi"); }
  };

  const addFavorite = async (m) => {
    try {
      await apiLokal.post('/api/movies', { 
        tmdb_id: m.id, 
        title: m.title, 
        poster_path: m.poster_path 
      });
      alert("Film Tersimpan ke HeidiSQL!");
      fetchFavorites();
    } catch (e) { alert("Gagal Simpan ke Database"); }
  };

  // LOGIKA UPDATE: Tombol Pintar (Tambah/Edit)
  const updateNote = async (id) => {
    const film = favorites.find(f => f.id === id);
    const label = film.personal_notes ? "Edit catatan kamu:" : "Tambah catatan baru:";
    const notes = prompt(label, film.personal_notes || "");
    
    if (notes !== null) {
      await apiLokal.put(`/api/movies/${id}`, { notes });
      alert("Berhasil memperbarui data!");
      fetchFavorites();
    }
  };

  const deleteFavorite = async (id) => {
    if (confirm("Hapus dari koleksi?")) {
      await apiLokal.delete(`/api/movies/${id}`);
      fetchFavorites();
    }
  };

  // Fitur Filter/Pencarian (Kriteria UAS 1c)
  const filteredMovies = movies.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return (
      <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={styles.authCard}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>🎬 MOVIE PLATFORM</h2>
          <form onSubmit={(e) => handleAuth(e, view)}>
            {view === 'register' && (
              <input style={styles.input} type="text" placeholder="Nama" onChange={e => setFormData({...formData, name: e.target.value})} required />
            )}
            <input style={styles.input} type="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
            <input style={styles.input} type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} required />
            <button style={styles.btnPrimary} type="submit">{view === 'login' ? 'LOGIN' : 'REGISTER'}</button>
          </form>
          <p onClick={() => setView(view === 'login' ? 'register' : 'login')} style={styles.switchText}>
            {view === 'login' ? 'Butuh akun? Daftar di sini' : 'Sudah punya akun? Masuk'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* HEADER DENGAN SEARCH BAR */}
      <div style={styles.header}>
        <h2 style={{ margin: 0 }}>Halo, {user.name} 👋</h2>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Cari film di sini..." 
            style={styles.searchBar}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => { apiLokal.post('/logout'); window.location.reload(); }} style={styles.btnLogout}>Logout</button>
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* KOLOM KIRI (KATALOG API) */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🎞️ Katalog Film</h3>
          <div style={styles.movieGrid}>
            {filteredMovies.map(m => (
              <div key={m.id} style={styles.card}>
                <img 
                  src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} 
                  alt={m.title} 
                  style={styles.img} 
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/200x300?text=No+Image'; }}
                />
                <p style={styles.movieTitle}>{m.title}</p>
                <button onClick={() => addFavorite(m)} style={styles.btnFav}>⭐ Simpan</button>
              </div>
            ))}
          </div>
        </div>

        {/* KOLOM KANAN (KOLEKSI CRUD) */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📂 Koleksi Saya (HeidiSQL)</h3>
          <div style={styles.favGrid}>
            {favorites.length === 0 && <p style={{opacity: 0.5}}>Koleksi kosong.</p>}
            {favorites.map(f => (
              <div key={f.id} style={styles.cardFav}>
                <div style={{ fontWeight: 'bold', color: '#00d2ff', marginBottom: '8px' }}>{f.title}</div>
                <div style={styles.noteBox}>
                  <b>Catatan:</b> {f.personal_notes || 'Belum ada catatan...'}
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  {/* TOMBOL PINTAR: Tambah vs Edit */}
                  <button onClick={() => updateNote(f.id)} style={styles.btnEditSmall}>
                    {f.personal_notes ? '✏️ Edit' : '➕ Tambah'}
                  </button>
                  <button onClick={() => deleteFavorite(f.id)} style={styles.btnDeleteSmall}>🗑️ Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- STYLING MEWAH & RESPONSIVE ---
const styles = {
  container: { padding: '40px 60px', background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 100%)', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' },
  searchBar: { padding: '10px 15px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', width: '250px', outline: 'none' },
  mainGrid: { display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '30px', alignItems: 'start' }, // Layout diperbaiki agar tidak kepotong
  section: { background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' },
  movieGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '20px' },
  card: { background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '15px', textAlign: 'center', transition: '0.3s' },
  img: { width: '100%', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' },
  movieTitle: { fontSize: '12px', fontWeight: 'bold', margin: '10px 0', minHeight: '30px' },
  btnFav: { width: '100%', padding: '8px', background: '#00d2ff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#fff' },
  cardFav: { background: 'rgba(255,255,255,0.06)', padding: '15px', borderRadius: '15px', marginBottom: '15px', borderLeft: '4px solid #00d2ff' },
  noteBox: { fontSize: '12px', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px', fontStyle: 'italic' },
  btnEditSmall: { padding: '6px 12px', background: '#f39c12', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px' },
  btnDeleteSmall: { padding: '6px 12px', background: '#e74c3c', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '12px' },
  authCard: { background: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '20px', width: '350px', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: 'none', outline: 'none' },
  btnPrimary: { width: '100%', padding: '12px', background: '#3a7bd5', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', color: '#fff' },
  btnLogout: { background: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' },
  switchText: { textAlign: 'center', marginTop: '15px', cursor: 'pointer', color: '#00d2ff', fontSize: '13px' }
};

export default App;