import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Konfigurasi API Lokal
const apiLokal = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: { 'Accept': 'application/json' }
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

  const fetchPublicMovies = async () => {
    try {
      const res = await axios.get('https://api.themoviedb.org/3/movie/popular?api_key=df8f98c61aa31d142e54f777305b7461');
      setMovies(res.data.results);
    } catch (err) {
      // Fallback data jika API TMDB 401
      setMovies([
        { id: 1, title: 'Iron Man (Backup)', poster_path: '/7WsyChvgywbsTUi0Yv0Pbww9RQA.jpg' },
        { id: 2, title: 'Avengers (Backup)', poster_path: '/or06vS3ST0PgpvC6P9p36C0Zp9K.jpg' },
        { id: 3, title: 'Spider-Man (Backup)', poster_path: '/1g0mXp9pf9YvW9js8mQ0uY7Ytqk.jpg' }
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
      const endpoint = type === 'register' ? '/register' : '/login';
      await apiLokal.post(endpoint, formData);

      if (type === 'register') {
        alert("Pendaftaran Berhasil! Silakan Login.");
        setView('login'); // Pindah ke laman login
      } else {
        checkLogin(); // Jika login baru masuk ke dashboard
      }
    } catch (err) {
      alert("Gagal! Pastikan email belum terdaftar & database jalan.");
    }
  };

  const handleLogout = async () => {
    try {
      await apiLokal.post('/logout');
      setUser(null);
      setView('login');
      window.location.reload(); 
    } catch (e) { 
      setUser(null); 
      setView('login'); 
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
      await apiLokal.post('/api/movies', { tmdb_id: m.id, title: m.title, poster_path: m.poster_path });
      fetchFavorites();
    } catch (e) { alert("Sudah ada di koleksi!"); }
  };

  const updateNote = async (id) => {
    const notes = prompt("Masukkan Catatan:");
    if (notes !== null) {
      await apiLokal.put(`/api/movies/${id}`, { notes });
      fetchFavorites();
    }
  };

  const deleteFavorite = async (id) => {
    if (confirm("Hapus film ini?")) {
      await apiLokal.delete(`/api/movies/${id}`);
      fetchFavorites();
    }
  };

  const filteredMovies = movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));

  // VIEW LOGIN/REGISTER (Centered)
  if (!user) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h2 style={{textAlign:'center', color:'#00d2ff'}}>🎬 MOVIE PORTAL</h2>
          <form onSubmit={(e) => handleAuth(e, view)}>
            {view === 'register' && (
              <input style={styles.input} type="text" placeholder="Nama Lengkap" onChange={e => setFormData({...formData, name: e.target.value})} required />
            )}
            <input style={styles.input} type="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
            <input style={styles.input} type="password" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} required />
            <button style={styles.btnPrimary} type="submit">
              {view === 'login' ? 'MASUK' : 'DAFTAR SEKARANG'}
            </button>
          </form>
          <p onClick={() => setView(view === 'login' ? 'register' : 'login')} style={styles.switchText}>
            {view === 'login' ? 'Belum punya akun? Daftar di sini' : 'Sudah punya akun? Login'}
          </p>
        </div>
      </div>
    );
  }

  // VIEW DASHBOARD (Full Width - Gak Kepotong)
  return (
    <div style={styles.dashboardFull}>
      <header style={styles.header}>
        <h2 style={{margin:0}}>Halo, {user.name} 👋</h2>
        <div style={{display:'flex', gap:'15px'}}>
          <input style={styles.searchBox} type="text" placeholder="Cari film..." onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={handleLogout} style={styles.btnLogout}>Logout</button>
        </div>
      </header>

      <div style={styles.mainLayout}>
        {/* KATALOG */}
        <div style={styles.leftCol}>
          <h3 style={styles.secTitle}>🎞️ Katalog Film Populer</h3>
          <div style={styles.movieGrid}>
            {filteredMovies.map(m => (
              <div key={m.id} style={styles.movieCard}>
                <img src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} style={styles.posterImg} alt={m.title} />
                <div style={{padding:'10px'}}>
                  <p style={styles.titleText}>{m.title}</p>
                  <button onClick={() => addFavorite(m)} style={styles.btnSave}>⭐ Simpan</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KOLEKSI */}
        <div style={styles.rightCol}>
          <h3 style={styles.secTitle}>📂 Koleksi Saya</h3>
          {favorites.map(f => (
            <div key={f.id} style={styles.favBox}>
              <div style={{fontWeight:'bold', color:'#00d2ff', marginBottom: '5px'}}>{f.title}</div>

              {/* Tampilan Catatan */}
              <div style={styles.noteBox}>
                {f.personal_notes ? (
                  <span><strong>Catatan:</strong> {f.personal_notes}</span>
                ) : (
                  <span style={{fontStyle: 'italic', color: '#888'}}>Belum ada catatan...</span>
                )}
              </div>

              <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
                {/* LOGIKA TOMBOL DINAMIS */}
                <button
                  onClick={() => updateNote(f.id)}
                  style={{
                    ...styles.btnSmall,
                    background: f.personal_notes ? '#f39c12' : '#27ae60' // Orange jika Edit, Hijau jika Tambah
                  }}
                >
                  {f.personal_notes ? '✏️ Edit Catatan' : '➕ Tambah Catatan'}
                </button>

                <button
                  onClick={() => deleteFavorite(f.id)}
                  style={{...styles.btnSmall, background:'#e74c3c'}}
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  authContainer: { width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f0c29' },
  authCard: { background: 'rgba(255,255,255,0.08)', padding: '40px', borderRadius: '15px', width: '350px' },
  dashboardFull: { width: '100%', minHeight: '100vh', background: '#0f0c29', color: '#fff', padding: '20px', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', marginBottom: '20px' },
  searchBox: { padding: '10px', borderRadius: '8px', border: 'none', width: '250px' },
  mainLayout: { display: 'flex', gap: '20px', width: '100%' }, // Flex untuk lebar penuh
  leftCol: { flex: 3, background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '15px' },
  rightCol: { flex: 1, background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', minWidth: '280px' },
  movieGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px' },
  movieCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' },
  posterImg: { width: '100%', height: '220px', objectFit: 'cover' },
  titleText: { fontSize: '12px', fontWeight: 'bold', height: '30px', overflow: 'hidden' },
  btnSave: { width: '100%', background: '#00d2ff', border: 'none', padding: '8px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  favBox: { background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px', marginBottom: '10px', borderLeft: '4px solid #00d2ff' },
  noteBox: { fontSize: '11px', color: '#aaa', marginTop: '5px' },
  btnSmall: { padding: '5px 10px', border: 'none', borderRadius: '4px', background: '#f39c12', color: '#fff', cursor: 'pointer', fontSize: '10px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: 'none', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '12px', background: '#3a7bd5', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  btnLogout: { background: '#e74c3c', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' },
  switchText: { textAlign: 'center', marginTop: '15px', cursor: 'pointer', color: '#00d2ff', fontSize: '13px' },
  secTitle: { marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }
};

export default App;