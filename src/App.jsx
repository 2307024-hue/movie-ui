import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2'; 


const apiLokal = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: { 'Accept': 'application/json' }
});

const App = () => {
  const [movies, setMovies] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [showPw, setShowPw] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', password_confirmation: '', remember: false });
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 20; // Lu bisa atur mau berapa film per halaman

  // Tambahkan daftar genre yang tersedia di TVMaze
  const genresList = ['All', 'Action', 'Drama', 'Comedy', 'Sci-Fi', 'Horror', 'Romance', 'Adventure'];

  // Fungsi Helper untuk merapikan data (biar gak nulis berulang)
  const adaptData = (data) => {
    return data.map(s => ({
      id: s.id || s.show?.id,
      title: s.name || s.show?.name,
      poster_path: s.image?.original || s.show?.image?.original || s.image?.medium || s.show?.image?.medium,
      summary: s.summary || s.show?.summary,
      genres: s.genres || s.show?.genres,
      rating: s.rating?.average || s.show?.rating?.average || '8.0',
      premiered: s.premiered || s.show?.premiered
    }));
  };

  useEffect(() => {
    fetchPublicMovies();
    checkLogin();
  }, []);

  // Efek Pencarian Global (Biar nyari ke seluruh database TVMaze)
  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchTerm.trim() !== "") {
        try {
          // Nyari langsung ke API TVMaze dengan keyword
          const res = await axios.get(`https://api.tvmaze.com/search/shows?q=${searchTerm}`);
          setMovies(adaptData(res.data)); // Hasil search global
        } catch (err) {
          console.error("Search Gagal");
        }
      } else {
        fetchPublicMovies(); // Balik ke dashboard acak kalau search kosong
      }
    }, 500); // Delay 500ms biar gak terlalu sering nembak API pas ngetik

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // Trigger ambil data baru kalau halaman berubah
  useEffect(() => {
    // TVMaze pake index 0, jadi page 1 di UI kita adalah page 0 di API mereka
    fetchPublicMovies(currentPage - 1);
    window.scrollTo(0, 0); // Balik ke atas pas ganti page
  }, [currentPage]);

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
    if (formData.password.length < 8) {
      return Swal.fire('Waduh!', 'Password minimal 8 karakter!', 'warning');
    }
    try {
      await apiLokal.get('/sanctum/csrf-cookie');
      const endpoint = type === 'register' ? '/register' : '/login';
      await apiLokal.post(endpoint, formData);
      if (type === 'register') {
        setIsNewUser(true); 
        Swal.fire({ title: 'Berhasil Daftar!', text: 'Akun barumu sudah siap. Yuk, masuk sekarang!', icon: 'success', confirmButtonColor: '#00d2ff' });
        setView('login');
      } else {
        checkLogin();
        const titleMsg = isNewUser ? 'Halo, Anggota Baru! 🥳' : 'Selamat Datang Kembali! 👋';
        const textMsg = isNewUser ? 'Akunmu aktif. Selamat mulai mengoleksi film!' : 'Senang melihatmu lagi di YaraFilm.';
        Swal.fire({ title: titleMsg, text: textMsg, icon: 'success', timer: 3000, showConfirmButton: false });
        setIsNewUser(false); 
      }
    } catch (err) {
      Swal.fire('Gagal!', 'Data tidak cocok atau database belum nyala.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await apiLokal.post('/logout');
      await Swal.fire({ title: 'Berhasil Keluar', text: 'Sampai jumpa lagi!', icon: 'success', timer: 1500, showConfirmButton: false });
    } catch (e) {
      console.error("Gagal Logout", e);
    } finally {
      setUser(null);
      setView('login');
      window.location.href = '/';
    }
  };

  const fetchPublicMovies = async (pageNumber = 0) => {
    setLoading(true);
    try {
      // Gunakan pageNumber dari pagination buat ambil data spesifik dari TVMaze
      const res = await axios.get(`https://api.tvmaze.com/shows?page=${pageNumber}`);

      if (res.data.length > 0) {
        const shuffled = res.data.sort(() => 0.5 - Math.random());
        setMovies(adaptData(shuffled));
      } else {
        setMovies([]); // Kosongkan kalau emang ga ada data di page itu
      }
    } catch (err) {
      console.error("API Error atau koneksi lambat");
      // Kalau error, kasih tau user
      Swal.fire('Waduh!', 'Koneksi lagi lemot atau API TVMaze capek, coba refresh ya.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await apiLokal.get('/api/movies');
      setFavorites(res.data);
    } catch (e) { console.log("Gagal sinkron data"); }
  };

  const updateNote = async (id, currentNote) => {
    const { value: text } = await Swal.fire({
      title: 'Tulis kesanmu tentang film ini...',
      input: 'textarea',
      inputValue: (currentNote === "Belum ada catatan" || !currentNote) ? "" : currentNote,
      showCancelButton: true,
      confirmButtonColor: '#3a7bd5'
    });
    if (text !== undefined) {
      try {
        await apiLokal.put(`/api/movies/${id}`, { notes: text });
        fetchFavorites();
        Swal.fire({ title: 'Tersimpan!', icon: 'success', timer: 1000, showConfirmButton: false });
      } catch (e) { Swal.fire('Error', 'Gagal simpan', 'error'); }
    }
  };

  const deleteFavorite = async (id) => {
    const result = await Swal.fire({ title: 'Hapus film?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' });
    if (result.isConfirmed) {
      await apiLokal.delete(`/api/movies/${id}`);
      fetchFavorites();
      Swal.fire('Terhapus!', 'Film dibuang dari koleksi.', 'success');
    }
  };

  // Fungsi Helper untuk Proteksi
  const protectedAction = (action) => {
    if (!user) {
      Swal.fire({
        title: 'Login Dulu Yuk!',
        text: 'Kamu harus masuk untuk menikmati fitur ini.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Login Sekarang',
        confirmButtonColor: '#ff4b2b'
      }).then((result) => {
        if (result.isConfirmed) setView('login');
      });
      return;
    }
    action();
  };

  // Fungsi untuk navigasi yang berfungsi
  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1); // WAJIB: Reset ke halaman 1 biar datanya keliatan
  };

  // Fungsi untuk mendapatkan film berdasarkan tab dan pencarian
  const getFilteredMovies = () => {
    let filtered = [...movies];

    // Filter Trending (Rating Tinggi)
    if (activeTab === 'trending') {
      filtered = filtered.filter(m => {
        const r = parseFloat(m.rating);
        return !isNaN(r) && r >= 7.5; // Gue turunin ke 7.5 biar pilihan filmnya lebih banyak muncul
      });
    }

    // Filter Genre
    if (selectedGenre !== 'All') {
      filtered = filtered.filter(m => m.genres?.includes(selectedGenre));
    }

    return filtered;
  };

  // Fungsi buat nampilin data yang sudah di-slice per halaman
  const getDisplayMovies = () => {
    const filtered = getFilteredMovies();
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filtered.slice(indexOfFirstItem, indexOfLastItem);
  };

  // Hitung data yang sudah difilter (Trending + Genre) sebelum dipagination
  const getFilteredCount = () => {
    let temp = [...movies];
    if (activeTab === 'trending') {
      temp = temp.filter(m => parseFloat(m.rating) >= 7.5);
    }
    if (selectedGenre !== 'All') {
      temp = temp.filter(m => m.genres?.includes(selectedGenre));
    }
    return temp.length;
  };

  // Kalau di Home, kita set total halaman banyak (misal 3430)
  // Kalau di Trending/Genre, kita itung dari data yang difilter
  const totalPages = (activeTab === 'home' && selectedGenre === 'All')
    ? 3430
    : Math.ceil(getFilteredCount() / itemsPerPage);

  if (view === 'login' || view === 'register') {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h2 style={{textAlign:'center', color:'#00d2ff', marginBottom:'30px'}}>🎬 MOVIE PORTAL</h2>
          <form onSubmit={(e) => handleAuth(e, view)}>
            {view === 'register' && (
              <input style={styles.input} type="text" placeholder="Nama Lengkap" onChange={e => setFormData({...formData, name: e.target.value})} required />
            )}
            <input style={styles.input} type="email" placeholder="Email" onChange={e => setFormData({...formData, email: e.target.value})} required />
            <div style={{position: 'relative'}}>
              <input
                style={styles.input}
                type={showPw ? "text" : "password"}
                placeholder="Password (Min. 8 Karakter)"
                onChange={e => setFormData({...formData, password: e.target.value, password_confirmation: e.target.value})} required
              />
              <span onClick={() => setShowPw(!showPw)} style={styles.eyeIcon}>
  {showPw ? '👁' : '⌣'}
</span>

            </div>
            <button style={styles.btnPrimary} type="submit">{view === 'login' ? 'MASUK' : 'DAFTAR SEKARANG'}</button>
          </form>
          <p onClick={() => setView(view === 'login' ? 'register' : 'login')} style={styles.switchText}>
            {view === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardFull}>
      {/* --- MODAL DETAIL (Diletakkan di dalam return utama) --- */}
      {selectedMovie && (
        <div style={styles.modalBackdrop} onClick={() => setSelectedMovie(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.btnClose} onClick={() => setSelectedMovie(null)}>✕</button>
            <div style={styles.modalBody}>
              <div style={styles.modalLeft}>
                <img src={selectedMovie.poster_path} style={styles.modalPosterFull} alt="poster" />
                <button style={styles.btnWatchAction}>▶ Masuk untuk nonton</button>
              </div>
              <div style={styles.modalRight}>
                <h1 style={styles.movieTitleMain}>{selectedMovie.title}</h1>
                <div style={styles.metaInfo}>
                  <span style={styles.badgeGray}>⭐ {selectedMovie.rating}</span>
                  <span style={styles.badgeGray}>📅 {selectedMovie.premiered?.split('-')[0] || 'TBA'}</span>
                </div>
                <div style={styles.tabsMenu}><span style={styles.tabActive}>Info Film</span></div>
                <p style={styles.descriptionText}>
                  {selectedMovie.summary ? selectedMovie.summary.replace(/<[^>]*>/g, '') : "Sinopsis tidak tersedia."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DASHBOARD CONTENT --- */}
      <header style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '30px'}}>
          {/* Nama Project Tegas */}
          <h1 style={styles.logo}>Yara<span style={{color: '#fff'}}>Film</span></h1>

          <nav style={styles.navLinks}>
            <span
              onClick={() => handleTabChange('home')}
              style={activeTab === 'home' ? styles.activeLink : styles.inactiveLink}
            >Home</span>
            <span
              onClick={() => handleTabChange('trending')}
              style={activeTab === 'trending' ? styles.activeLink : styles.inactiveLink}
            >Trending</span>
          </nav>
        </div>

        <div style={{display: 'flex', gap: '20px', alignItems: 'center'}}>
          {/* Input Cari */}
          <input
            style={styles.searchBox}
            placeholder="Cari film..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {user ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
              {/* Nama User Ditegaskan */}
              <span style={styles.userNameDisplay}>
                HALO, {user.name.toUpperCase()} 👋
              </span>
              {/* Tombol Keluar Merah */}
              <button onClick={handleLogout} style={styles.btnKeluar}>
                KELUAR
              </button>
            </div>
          ) : (
            <button onClick={() => setView('login')} style={styles.btnMasuk}>
              Masuk/Daftar
            </button>
          )}
        </div>
      </header>

      <div style={styles.mainLayout}>
        <div style={styles.leftCol}>
          <h3 style={styles.secTitle}>🎞️ Katalog Populer</h3>
          {/* Filter Genre Dropdown */}
          <div style={{marginBottom: '20px'}}>
            <select value={selectedGenre} onChange={(e) => { setSelectedGenre(e.target.value); setCurrentPage(1); }} style={{padding: '10px', borderRadius: '5px', background: '#333', color: '#fff', border: '1px solid #555'}}>
              {genresList.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {loading ? (
            <div style={{textAlign: 'center', padding: '50px', color: '#00d2ff'}}>
              <p>Loading movies...</p>
            </div>
          ) : (
            <div style={styles.movieGrid}>
              {getDisplayMovies()
                .map(m => (
                <div key={m.id} style={styles.movieCard} onClick={() => setSelectedMovie(m)}>
                  <img src={m.poster_path} style={styles.posterImg} alt={m.title} />
                  <div style={{padding:'12px'}}>
                    <p style={styles.titleText}>{m.title}</p>
                    <p style={{fontSize:'12px', color:'#888', marginBottom:'10px'}}>
                      📅 {m.premiered ? m.premiered.split('-')[0] : 'TBA'} | ⭐ {m.rating}
                    </p>
                    <button onClick={(e) => {
                      e.stopPropagation(); // Mencegah modal terbuka saat klik simpan
                      protectedAction(() => {
                        apiLokal.post('/api/movies', { tmdb_id: m.id, title: m.title, poster_path: m.poster_path })
                        .then(() => { fetchFavorites(); Swal.fire({title: 'Disimpan!', icon: 'success', timer: 800, showConfirmButton: false}); })
                        .catch(() => Swal.fire('Info', 'Sudah ada di koleksi!', 'info'));
                      });
                    }} style={styles.btnSave}>⭐ Simpan</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* UI Pagination (Angka halaman di bawah) */}
          <div style={{marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '10px'}}>
            <button onClick={() => setCurrentPage(1)} style={{padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>« First</button>
            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} style={{padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>‹ Prev</button>

            {/* Menampilkan hanya 5 angka halaman di sekitar halaman aktif */}
            {[...Array(totalPages)].map((_, i) => {
              const pageNum = i + 1;
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
              ) {
                return (
                  <button
                    key={pageNum}
                    className={currentPage === pageNum ? 'active' : ''}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{
                      padding: '8px 12px',
                      background: currentPage === pageNum ? '#00d2ff' : '#333',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                return <span key={pageNum}>...</span>;
              }
              return null;
            })}

            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} style={{padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Next ›</button>
            <button onClick={() => setCurrentPage(totalPages)} style={{padding: '8px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Last »</button>
          </div>
        </div>

        <div style={styles.rightCol}>
          <h3 style={styles.secTitle}>📂 Koleksi Saya</h3>
          {favorites.map(f => {
            const hasNote = f.notes && f.notes !== "Belum ada catatan" && f.notes.trim() !== "";
            return (
              <div key={f.id} style={styles.favBox}>
                <div style={{fontWeight:'bold', color:'#00d2ff', marginBottom: '5px'}}>{f.title}</div>
                <div style={styles.noteBox}>
                  {hasNote ? <span><strong>📝 Catatan:</strong> {f.notes}</span> : <span style={{fontStyle: 'italic', color: '#888'}}>⚠️ Belum ada catatan</span>}
                </div>
                <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
                  <button onClick={() => updateNote(f.id, f.notes)} style={{...styles.btnSmall, background: hasNote ? '#f39c12' : '#27ae60'}}>{hasNote ? 'Update' : 'Tambah'}</button>
                  <button onClick={() => deleteFavorite(f.id)} style={{...styles.btnSmall, background:'#e74c3c'}}>🗑️Hapus</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles = {
  authContainer: { width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  authCard: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '20px', width: '380px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: 'none', background: 'rgba(0,0,0,0.2)', color: '#fff', boxSizing: 'border-box' },
  eyeIcon: { position: 'absolute', right: '15px', top: '12px', cursor: 'pointer', fontSize: '18px' },
  btnPrimary: { width: '100%', padding: '12px', background: '#00d2ff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  dashboardFull: { width: '100vw', minHeight: '100vh', background: '#0f0c29', color: '#fff', padding: '20px', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', marginBottom: '25px' },
  mainLayout: { display: 'flex', gap: '25px' },
  leftCol: { flex: 3 },
  rightCol: { flex: 1, background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px' },
  movieGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' },
  movieCard: { background: '#1a1a2e', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333' },
  posterImg: { width: '100%', height: '240px', objectFit: 'cover' },
  titleText: { fontSize: '14px', fontWeight: 'bold', color: '#fff', marginBottom: '5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  btnSave: { width: '100%', background: 'rgba(0,210,255,0.1)', color: '#00d2ff', border: '1px solid #00d2ff', padding: '6px', borderRadius: '6px', cursor: 'pointer' },
  favBox: { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '15px', borderLeft: '4px solid #00d2ff' },
  noteBox: { fontSize: '11px', marginTop: '8px', color: '#ccc' },
  btnSmall: { padding: '6px 10px', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '11px' },
  btnLogout: { background: '#ff4b2b', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' },
  btnLoginNav: { background: '#ff4b2b', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' },
  logo: {
    color: '#ff4b2b',
    fontSize: '28px',
    fontWeight: '900',
    letterSpacing: '1px'
  },
  navLinks: { display: 'flex', gap: '20px', fontSize: '16px', color: '#fff' },
  activeLink: {
    color: '#ff4b2b',
    cursor: 'pointer',
    fontWeight: 'bold',
    borderBottom: '2px solid #ff4b2b',
    paddingBottom: '5px'
  },
  inactiveLink: {
    color: '#fff',
    cursor: 'pointer',
    opacity: 0.6
  },
  searchBox: {
    background: '#1a1a1a',
    color: '#fff',
    border: '1px solid #333',
    padding: '10px 20px',
    borderRadius: '25px',
    width: '220px',
    outline: 'none'
  },
  userNameDisplay: {
    fontSize: '14px',
    fontWeight: '800', // Sangat tebal
    color: '#fff',
    letterSpacing: '0.5px',
    borderRight: '2px solid #333', // Pemberi sekat biar rapi
    paddingRight: '15px'
  },
  btnKeluar: {
    background: '#ff0000', // Merah murni/tegas
    color: '#fff',
    border: 'none',
    padding: '8px 18px',
    borderRadius: '5px',
    fontWeight: '900',
    cursor: 'pointer',
    fontSize: '12px'
  },
  btnMasuk: {
    background: '#ff4b2b',
    color: '#fff',
    border: 'none',
    padding: '10px 25px',
    borderRadius: '25px',
    fontWeight: 'bold',
    cursor: 'pointer'
  },
  switchText: { textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: '#00d2ff', fontSize: '14px' },
  secTitle: { marginBottom: '20px', fontSize: '18px', borderLeft: '4px solid #00d2ff', paddingLeft: '10px' },
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modalContent: { background: '#121212', width: '800px', borderRadius: '15px', padding: '30px', position: 'relative', border: '1px solid #333' },
  modalBody: { display: 'flex', gap: '30px' },
  modalLeft: { flex: '0 0 250px' },
  modalPosterFull: { width: '100%', borderRadius: '10px' },
  btnWatchAction: { width: '100%', padding: '12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', marginTop: '15px', fontWeight: 'bold' },
  modalRight: { flex: 1 },
  movieTitleMain: { fontSize: '32px', margin: '0 0 10px 0' },
  metaInfo: { display: 'flex', gap: '15px', marginBottom: '20px' },
  badgeGray: { background: '#333', padding: '5px 12px', borderRadius: '5px', fontSize: '13px' },
  tabsMenu: { borderBottom: '1px solid #333', marginBottom: '15px' },
  tabActive: { paddingBottom: '5px', borderBottom: '2px solid #fff', display: 'inline-block' },
  descriptionText: { color: '#ccc', lineHeight: '1.6', fontSize: '14px' },
  btnClose: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }
};

export default App;