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
  const [view, setView] = useState('login');
  const [showPw, setShowPw] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', password_confirmation: '', remember: false });
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  useEffect(() => {
    fetchPublicMovies();
    checkLogin();
  }, []);

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
  
  // Validasi PW minimal 8
  if (formData.password.length < 8) {
    return Swal.fire('Waduh!', 'Password minimal 8 karakter!', 'warning');
  }

  try {
    await apiLokal.get('/sanctum/csrf-cookie');
    const endpoint = type === 'register' ? '/register' : '/login';
    await apiLokal.post(endpoint, formData);
    
    if (type === 'register') {
      // KUNCI STATUS: Dia baru saja daftar!
      setIsNewUser(true); 
      
      Swal.fire({
        title: 'Berhasil Daftar!',
        text: 'Akun barumu sudah siap. Yuk, masuk sekarang!',
        icon: 'success',
        confirmButtonColor: '#00d2ff'
      });
      setView('login'); // Pindah ke halaman login
    } else {
      // SAAT LOGIN: Cek apakah dia datang dari jalur "Daftar" atau tidak
      checkLogin();

      // Jika isNewUser true = Baru Daftar. Jika false = Sudah ada akun (User Lama)
      const titleMsg = isNewUser ? 'Halo, Anggota Baru! 🥳' : 'Selamat Datang Kembali! 👋';
      const textMsg = isNewUser 
        ? 'Akunmu aktif. Selamat mulai mengoleksi film!' 
        : 'Senang melihatmu lagi di Movie Portal.';

      Swal.fire({ 
        title: titleMsg, 
        text: textMsg, 
        icon: 'success', 
        timer: 3000, 
        showConfirmButton: false 
      });

      // PENTING: Reset jadi false setelah login sukses agar tidak tertukar nanti
      setIsNewUser(false); 
    }
  } catch (err) {
    Swal.fire('Gagal!', 'Data tidak cocok atau database belum nyala.', 'error');
  }
};
  const handleLogout = async () => {
    try {
      // 1. Tunggu Laravel menghapus session di server
      await apiLokal.post('/logout');

      // 2. Tampilkan pesan sukses yang elegan
      await Swal.fire({
        title: 'Berhasil Keluar',
        text: 'Sampai jumpa lagi!',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (e) {
      console.error("Gagal Logout", e);
    } finally {
      // 3. Hapus data user di React & paksa refresh ke halaman login
      setUser(null);
      setView('login');
      window.location.href = '/';
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
      title: 'Tulis Catatan',
      input: 'textarea',
      inputValue: (currentNote === "Belum ada catatan" || !currentNote) ? "" : currentNote,
      inputPlaceholder: 'Apa pendapatmu tentang film ini...',
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
    const result = await Swal.fire({
      title: 'Hapus film?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
      await apiLokal.delete(`/api/movies/${id}`);
      fetchFavorites();
      Swal.fire('Terhapus!', 'Film dibuang dari koleksi.', 'success');
    }
  };

 const fetchPublicMovies = async () => {
  try {
    // 1. Coba ambil dari TMDB (Sumber Utama)
    const res = await axios.get('https://api.themoviedb.org/3/movie/popular?api_key=93e98822081682701fa1d8e13735749a');
    setMovies(res.data.results);
    console.log("Berhasil ambil dari TMDB");
  } catch (err) {
    console.warn("TMDB Gagal, Mencoba API Cadangan (TVMaze)...");

    try {
      // 2. Jika TMDB mati, ambil dari TVMaze (Sumber Alternatif - Realtime juga!)
      const resAlt = await axios.get('https://api.tvmaze.com/shows');

      // Kita sesuaikan format datanya agar cocok dengan UI kamu
      const adaptedData = resAlt.data.slice(0, 20).map(s => ({
        id: s.id,
        title: s.name,
        poster_path: s.image?.medium.replace('http://', 'https://'), // Gambar asli dari TVMaze
        summary: s.summary // Sinopsis asli dari TVMaze
      }));

      setMovies(adaptedData);
      console.log("Berhasil ambil dari TVMaze!");
    } catch (errAlt) {
      // 3. Jika internet benar-benar mati total, baru munculkan pesan error
      Swal.fire('Koneksi Putus', 'Semua sumber API gagal dimuat. Cek internet kamu.', 'error');
    }
  }
};

  if (!user) {
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
                {showPw ? '🙈' : '👁️'}
              </span>
            </div>

            <div style={styles.rememberRow}>
              <input type="checkbox" id="rem" onChange={e => setFormData({...formData, remember: e.target.checked})} />
              <label htmlFor="rem">Ingat Saya</label>
            </div>

            <button style={styles.btnPrimary} type="submit">
              {view === 'login' ? 'MASUK' : 'DAFTAR SEKARANG'}
            </button>
          </form>
          <p onClick={() => setView(view === 'login' ? 'register' : 'login')} style={styles.switchText}>
            {view === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Login'}
          </p>
      </div>
    </div>
  );

  return selectedMovie ? (
    <div style={styles.modalBackdrop} onClick={() => setSelectedMovie(null)}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button style={styles.btnClose} onClick={() => setSelectedMovie(null)}>✕</button>

        <div style={styles.modalBody}>
          <div style={styles.modalLeft}>
            <div style={styles.posterWrapper}>
              <img
                src={selectedMovie.poster_path?.startsWith('http') ? selectedMovie.poster_path : `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}`}
                style={styles.modalPosterFull}
              />
              <div style={styles.playIconOverlay}>▶</div>
            </div>
            <button style={styles.btnWatchNow} onClick={() => window.open('https://www.youtube.com/results?search_query=' + selectedMovie.title + ' trailer', '_blank')}>
              👤 Masuk untuk nonton
            </button>
          </div>

          <div style={styles.modalRight}>
            <h1 style={styles.movieTitleBig}>{selectedMovie.title}</h1>

            <div style={styles.metaRow}>
              <span style={styles.metaBadge}>104 minutes</span>
              <span style={styles.metaBadge}>Movie Portal Premiere</span>
            </div>

            <div style={styles.tabContainer}>
              <span style={styles.tabLinkActive}>Info Film</span>
              <span style={styles.tabLink}>Detail Film</span>
            </div>

            <p style={styles.synopsisText}>
              {selectedMovie.notes && selectedMovie.notes !== "Belum ada catatan"
                ? selectedMovie.notes
                : selectedMovie.summary
                  ? selectedMovie.summary.replace(/<[^>]*>/g, '') // Remove HTML tags from TVMaze summary
                  : "Sekelompok aktivis lingkungan muda melancarkan sebuah misi berani untuk menyabotase pipa minyak. (Data sinopsis realtime dari API)"}
            </p>

            <div style={styles.actionRow}>
              <button onClick={() => updateNote(selectedMovie.id, selectedMovie.notes)} style={styles.btnEditNote}>📝 Edit Catatan</button>
              <button onClick={() => { deleteFavorite(selectedMovie.id); setSelectedMovie(null); }} style={styles.btnDeleteFav}>🗑️ Hapus Koleksi</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div style={styles.dashboardFull}>
      <header style={styles.header}>
        <h2 style={{margin:0}}>Halo, {user.name} 👋</h2>
        <div style={{display:'flex', gap:'15px'}}>
          <input style={styles.searchBox} type="text" placeholder="Cari film..." onChange={(e) => setSearchTerm(e.target.value)} />
          <button onClick={handleLogout} style={styles.btnLogout}>Logout</button>
        </div>
      </header>

      <div style={styles.mainLayout}>
        <div style={styles.leftCol}>
          <h3 style={styles.secTitle}>🎞️ Katalog Populer</h3>
          <div style={styles.movieGrid}>
            {movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
              <div key={m.id} style={styles.movieCard} onClick={() => setSelectedMovie(m)}>
               <img
  src={m.poster_path && m.poster_path.startsWith('http')
       ? m.poster_path
       : `https://image.tmdb.org/t/p/w500${m.poster_path}`}
  style={styles.posterImg}
  alt={m.title}
  onError={(e) => { e.target.src = 'https://via.placeholder.com/200x300?text=No+Image'; }}
/>
                <div style={{padding:'12px', textAlign: 'left'}}>
                  <p style={styles.titleText}>{m.title}</p>
                  
                  {/* INFORMASI TAMBAHAN ALA TVMAZE */}
                  <div style={{fontSize: '12px', color: '#888', marginBottom: '8px'}}>
                    <span>📅 {m.release_date ? m.release_date.split('-')[0] : 'TBA'}</span> 
                    <span style={{marginLeft: '10px'}}>⭐ {m.vote_average || 'N/A'}</span>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); 
                    apiLokal.post('/api/movies', { tmdb_id: m.id, title: m.title, poster_path: m.poster_path })
                    .then(() => { fetchFavorites(); Swal.fire({title: 'Disimpan!', icon: 'success', timer: 800, showConfirmButton: false}); })
                    .catch(() => Swal.fire('Info', 'Sudah ada di koleksi!', 'info'));
                  }} style={styles.btnSimpan}>⭐ Simpan ke Koleksi</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightCol}>
  <h3 style={styles.secTitle}>📂 Koleksi Saya (HeidiSQL)</h3>
  {favorites.map(f => {
    // Logika pengecekan catatan agar tombol dinamis (Hijau/Orange)
    const hasNote = f.notes && f.notes !== "Belum ada catatan" && f.notes.trim() !== "";

    return (
      <div key={f.id} style={styles.favBox}>
        <div style={{fontWeight:'bold', color:'#00d2ff', marginBottom: '5px'}}>{f.title}</div>

        <div style={styles.noteBox}>
          {hasNote ? (
            <span><strong>📝 Catatan:</strong> {f.notes}</span>
          ) : (
            <span style={{fontStyle: 'italic', color: '#888'}}>⚠️ Belum ada catatan</span>
          )}
        </div>

        {/* Container Tombol agar Berdampingan */}
        <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
          <button
            onClick={() => updateNote(f.id, f.notes)}
            style={{
              ...styles.btnSmall,
              background: hasNote ? '#f39c12' : '#27ae60' // Orange jika Update, Hijau jika Tambah
            }}
          >
            {hasNote ? 'Update Catatan' : 'Tambah Catatan'}
          </button>

          <button
            onClick={() => deleteFavorite(f.id)}
            style={{...styles.btnSmall, background:'#e74c3c'}}
          >
            🗑️ Hapus
          </button>
        </div>
      </div>
    );
  })}
</div>
      </div>
    </div>
  );
  }

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
        <div style={styles.leftCol}>
          <h3 style={styles.secTitle}>🎞️ Katalog Populer</h3>
          <div style={styles.movieGrid}>
            {movies.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase())).map(m => (
              <div key={m.id} style={styles.movieCard} onClick={() => setSelectedMovie(m)}>
               <img
  src={m.poster_path && m.poster_path.startsWith('http')
       ? m.poster_path
       : `https://image.tmdb.org/t/p/w500${m.poster_path}`}
  style={styles.posterImg}
  alt={m.title}
  onError={(e) => { e.target.src = 'https://via.placeholder.com/200x300?text=No+Image'; }}
/>
                <div style={{padding:'12px'}}>
                  <p style={styles.titleText}>{m.title}</p>
                  <button onClick={() => {
                    apiLokal.post('/api/movies', { tmdb_id: m.id, title: m.title, poster_path: m.poster_path })
                    .then(() => { fetchFavorites(); Swal.fire({title: 'Disimpan!', icon: 'success', timer: 800, showConfirmButton: false}); })
                    .catch(() => Swal.fire('Info', 'Sudah ada di koleksi!', 'info'));
                  }} style={styles.btnSave}>⭐ Simpan</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightCol}>
  <h3 style={styles.secTitle}>📂 Koleksi Saya (HeidiSQL)</h3>
  {favorites.map(f => {
    // Logika pengecekan catatan agar tombol dinamis (Hijau/Orange)
    const hasNote = f.notes && f.notes !== "Belum ada catatan" && f.notes.trim() !== "";

    return (
      <div key={f.id} style={styles.favBox}>
        <div style={{fontWeight:'bold', color:'#00d2ff', marginBottom: '5px'}}>{f.title}</div>
        
        <div style={styles.noteBox}>
          {hasNote ? (
            <span><strong>📝 Catatan:</strong> {f.notes}</span>
          ) : (
            <span style={{fontStyle: 'italic', color: '#888'}}>⚠️ Belum ada catatan</span>
          )}
        </div>

        {/* Container Tombol agar Berdampingan */}
        <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
          <button
            onClick={() => updateNote(f.id, f.notes)}
            style={{
              ...styles.btnSmall,
              background: hasNote ? '#f39c12' : '#27ae60' // Orange jika Update, Hijau jika Tambah
            }}
          >
            {hasNote ? 'Update Catatan' : 'Tambah Catatan'}
          </button>

          <button 
            onClick={() => deleteFavorite(f.id)} 
            style={{...styles.btnSmall, background:'#e74c3c'}}
          >
            🗑️ Hapus
          </button>
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
  rememberRow: { marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '13px' },
  btnPrimary: { width: '100%', padding: '12px', background: '#00d2ff', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  dashboardFull: { width: '100vw', minHeight: '100vh', background: '#0f0c29', color: '#fff', padding: '20px', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', marginBottom: '25px' },
  mainLayout: { display: 'flex', gap: '25px' },
  leftCol: { flex: 3 },
  rightCol: { flex: 1, background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px' },
  movieGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' },
  movieCard: { background: '#1a1a2e', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid #333' },
  posterImg: { width: '100%', height: '350px', objectFit: 'cover' },
  titleText: { fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  btnSave: { width: '100%', background: 'rgba(0,210,255,0.2)', color: '#00d2ff', border: '1px solid #00d2ff', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
  favBox: { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px', marginBottom: '15px', borderLeft: '4px solid #00d2ff' },
  noteBox: { fontSize: '12px', marginTop: '8px', color: '#ccc' },
  btnSmall: { padding: '6px 12px', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  btnLogout: { background: '#ff4b2b', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer' },
  searchBox: { padding: '10px 15px', borderRadius: '8px', border: 'none', width: '280px', background: 'rgba(255,255,255,0.1)', color: '#fff' },
  switchText: { textAlign: 'center', marginTop: '20px', cursor: 'pointer', color: '#00d2ff', fontSize: '14px' },
  secTitle: { marginBottom: '20px', fontSize: '18px', borderLeft: '4px solid #00d2ff', paddingLeft: '10px' },
  favGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
  favCard: { position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', transition: '0.3s' },
  favPoster: { width: '100%', height: '180px', objectFit: 'cover' },
  favOverlay: { position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.7)', padding: '5px', fontSize: '10px', textAlign: 'center' },

  // MODAL STYLE ALA KLIKFILM
  modalBackdrop: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
  modalContent: { background: '#121212', width: '900px', borderRadius: '15px', padding: '40px', position: 'relative', border: '1px solid #333' },
  modalBody: { display: 'flex', gap: '40px', textAlign: 'left' },
  modalLeft: { flex: '0 0 300px' },
  posterContainer: { position: 'relative', marginBottom: '20px' },
  modalPosterFull: { width: '100%', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  playOverlay: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,0,0,0.7)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px', color: '#fff' },
  btnWatchAction: { width: '100%', padding: '15px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },

  modalRight: { flex: 1, color: '#fff' },
  movieTitleMain: { fontSize: '42px', margin: '0 0 15px 0', fontWeight: 'bold' },
  metaInfo: { display: 'flex', gap: '15px', marginBottom: '25px' },
  badgeGray: { background: '#222', padding: '5px 15px', borderRadius: '5px', fontSize: '14px', color: '#ccc' },
  tabsMenu: { display: 'flex', gap: '30px', borderBottom: '1px solid #333', marginBottom: '20px' },
  tabActive: { paddingBottom: '10px', borderBottom: '3px solid #fff', fontWeight: 'bold' },
  tabInactive: { color: '#666' },
  descriptionText: { lineHeight: '1.8', color: '#bbb', fontSize: '16px', marginBottom: '40px' },

  modalFooterActions: { display: 'flex', gap: '15px' },
  btnEditCyan: { padding: '10px 25px', background: '#00d2ff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' },
  btnDeleteGhost: { padding: '10px 25px', background: 'transparent', border: '1px solid #ff4b2b', color: '#ff4b2b', borderRadius: '5px', cursor: 'pointer' },
  btnClose: { position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '28px', cursor: 'pointer' }
};

export default App;