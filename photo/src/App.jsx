import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import PocketBase from 'pocketbase'
import { motion, AnimatePresence } from "framer-motion";
import Auth from './Auth'
import './App.css'
import AvatarUpload from './assets/AvatarUpload.jsx'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const pb = new PocketBase('https://model.john5bb.com')
pb.autoCancellation(false);

const variants = {
  enter: (direction) => ({ x: direction > 0 ? 1000 : -1000, opacity: 0, scale: 0.95 }),
  center: { zIndex: 1, x: 0, opacity: 1, scale: 1 },
  exit: (direction) => ({ zIndex: 0, x: direction < 0 ? 1000 : -1000, opacity: 0, scale: 0.95 })
};

// --- HELPERS ---
const enterFullscreen = () => {
  if (window.innerWidth > 768) return;
  const elem = document.documentElement;
  if (elem.requestFullscreen) elem.requestFullscreen().catch(() => { });
  else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen().catch(() => { });
};

const exitFullscreen = () => {
  if (document.exitFullscreen) document.exitFullscreen().catch(() => { });
  else if (document.webkitExitFullscreen) document.webkitExitFullscreen().catch(() => { });
};

const swipeConfidenceThreshold = 2000;
const swipePower = (offset, velocity) => Math.abs(offset) * velocity;

// --- PROGRESSIVE IMAGE (THE VIEWER) ---
const ProgressiveImage = ({ photo, direction, onDragEnd, onClose }) => {
  const [loaded, setLoaded] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const isZoomedRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const thumbUrl = pb.files.getURL(photo, photo.image, { thumb: '480x0' });
  const fullUrl = pb.files.getURL(photo, photo.image);

  return (
    <motion.div
      key={photo.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: "spring", stiffness: 400, damping: 40 },
        opacity: { duration: 0.2 }
      }}
      drag={isZoomed ? false : true}
      dragDirectionLock={false}
      dragSnapToOrigin={true}
      dragElastic={1}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        if (isZoomedRef.current) return;
        onDragEnd(e, info);
      }}
      className="progressive-wrapper"
      style={{
        position: 'absolute', width: '100%', height: '100%',
        display: 'flex', justifyContent: 'center', alignItems: 'center', touchAction: 'none'
      }}
    >
      {!loaded && <div style={{ position: 'absolute', zIndex: 10 }}><div className="spinner"></div></div>}

      <div className="responsive-container">
        <img
          src={thumbUrl} alt=""
          className="lightbox-thumb lightbox-img-shared"
          style={{ opacity: loaded ? 0 : 1 }}
        />

        <TransformWrapper
          initialScale={1} minScale={0.5} maxScale={5}
          centerOnInit={true} wheel={{ step: 1 }}
          panning={{ disabled: !isZoomed, velocityDisabled: true }}
          onZoomStart={() => {
            setIsZoomed(true);
            isZoomedRef.current = true;
          }}
          onPanningStart={() => {
            setIsZoomed(true);
            isZoomedRef.current = true;
          }}
          onTransformed={(ref) => {
            const scale = ref.state.scale;
            if (scale < 0.65) {
              onClose && onClose();
              return;
            }
            const zoomed = scale > 1.01;
            setIsZoomed(zoomed);
            isZoomedRef.current = zoomed;
          }}
          onZoomStop={(ref) => {
            if (ref.state.scale < 1 && ref.state.scale >= 0.65) {
              ref.resetTransform();
            }
          }}
        >
          <TransformComponent wrapperClass="react-transform-wrapper" contentClass="react-transform-component">
            <img
              src={fullUrl} alt=""
              className="lightbox-img-shared"
              onLoad={() => setLoaded(true)}
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>
    </motion.div>
  );
};

// --- MAIN APP ---
function App() {
  const [user, setUser] = useState(pb.authStore.model)
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [[page, direction], setPage] = useState([0, 0]);
  const [userList, setUserList] = useState([])
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [viewingUser, setViewingUser] = useState(pb.authStore.model?.id || null);

  // FIX: Moved inside App component
  const [filterOpen, setFilterOpen] = useState(false);

  // FIX: Moved inside App component
  const handleSelectUser = (id) => {
    setViewingUser(id);
    setFilterOpen(false);
  };

  const closeLightbox = useCallback(() => {
    exitFullscreen();
    setTimeout(() => setSelectedPhoto(null), 50);
  }, []);

  const changePhoto = useCallback((newDir) => {
    if (!selectedPhoto) return;
    const idx = photos.findIndex(p => p.id === selectedPhoto.id);
    let next = idx + newDir;
    if (next < 0) next = photos.length - 1;
    if (next >= photos.length) next = 0;
    // Use functional update for setPage to avoid depending on `page`
    setPage(p => [p[0] + newDir, newDir]);
    setSelectedPhoto(photos[next]);
  }, [photos, selectedPhoto]);


  useEffect(() => {
    async function init() {
      if (pb.authStore.isValid && pb.authStore.model) {
        try {
          const u = await pb.collection('users').getOne(pb.authStore.model.id);
          setUser(u);
        } catch { }
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    let isCancelled = false;
    async function loadData() {
      try {
        // 1. Fetch Users for the dropdown
        const users = await pb.collection('users').getList(1, 100, { filter: user.verified ? '' : 'public = true' });
        const current = users.items.find(u => u.id === user.id);
        if (!isCancelled) {
          setUserList(current ? users.items : [user, ...users.items]);
        }
        // 2. Fetch Photos based on filter
        let filter = '';
        if (viewingUser) {
          // Case A: A specific user is selected (Me or someone else)
          filter = `owner = "${viewingUser}"`;
        } else {
          // Case B: "View All" is selected (viewingUser is null)
          // If Admin: Show everything. 
          // If Normal: Show my photos OR any public photos.
          filter = user.verified ? '' : `(owner.public = true || owner = "${user.id}")`;
        }

        const p = await pb.collection('photos').getList(1, 50, { sort: '-created', filter, expand: 'owner' });

        if (!isCancelled) {
          setPhotos(p.items);
        }
      } catch (err) {
        if (!isCancelled) console.error(err);
      }
    }
    loadData();
    return () => { isCancelled = true; };
  }, [user, viewingUser]); // Re-run whenever user or viewingUser changes

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const owner = user.verified && viewingUser ? viewingUser : user.id;
      const proms = files.map(f => {
        const fd = new FormData();
        fd.append('image', f); fd.append('owner', owner);
        return pb.collection('photos').create(fd);
      });
      const newP = await Promise.all(proms);
      setPhotos(prev => [...newP, ...prev]);
    } catch { alert("Upload error"); }
    finally { setUploading(false); }
  };

  const confirmDelete = async () => {
    if (!photoToDelete) return;
    try {
      await pb.collection('photos').delete(photoToDelete.id);
      setPhotos(p => p.filter(x => x.id !== photoToDelete.id));
      setPhotoToDelete(null);
    } catch { alert("Delete failed"); }
  };

  const getTitle = () => {
    if (viewingUser === user.id) return "My Gallery";
    if (!viewingUser) return "All Photos";
    const u = userList.find(x => x.id === viewingUser);
    return u ? u.name || "User" : "Gallery";
  };

  const grid = useMemo(() => (
    <div className='masonry-container'>
      <div className="masonry-grid">
        {photos.map((photo, i) => (
          <div key={photo.id} className="masonry-item">
            {(user.verified || photo.owner === user.id) && (
              <div className="delete-btn-overlay" onClick={(e) => { e.stopPropagation(); setPhotoToDelete(photo); }}>
                <span className="material-symbols-outlined">close</span>
              </div>
            )}
            <img
              src={pb.files.getURL(photo, photo.image, { thumb: '480x0' })}
              loading={i < 4 ? "eager" : "lazy"}
              className="photo-img"
              onClick={() => { enterFullscreen(); setPage([page + 1, 1]); setSelectedPhoto(photo); }}
            />
          </div>
        ))}
      </div>
    </div>
  ), [photos, page, user]);

  const toggleVisibility = async () => {
    // 1. Calculate the new status (flip true to false, or false to true)
    const newStatus = !user.public;

    // 2. Update Local State immediately (so the UI feels fast)
    setUser({ ...user, public: newStatus });

    try {
      // 3. Update the Database (PocketBase)
      // Replace 'users' with your actual collection name if it's different
      await pb.collection('users').update(user.id, {
        public: newStatus
      });
      console.log("Database updated to:", newStatus);

    } catch (error) {
      console.error("Failed to update database:", error);
      // Optional: Revert the switch if it failed
      setUser({ ...user, public: !newStatus });
    }
  };

  // --- KEYBOARD NAVIGATION ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedPhoto) return;
      if (e.key === 'ArrowRight') changePhoto(1);
      if (e.key === 'ArrowLeft') changePhoto(-1);
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, changePhoto, closeLightbox]); // Dependencies are now stable


  if (!user) return <Auth pb={pb} onLogin={setUser} />;

  return (
    <div className="gallery-container">
      <header>
        <div className="header">
          <div className="profile-dropdown" tabIndex={0}>
            <div className="profile-bubble">
              <div className="profile-image">
                {user.avatar ? <img src={pb.files.getURL(user, user.avatar, { thumb: '100x0' })} /> : <span className="material-symbols-outlined">account_circle</span>}
              </div>
              <div className="profile-info">
                <span className='username'>
                  {user.name}
                  {user.verified && <span className="material-symbols-outlined" style={{ fontSize: '0.9rem', marginLeft: '4px', verticalAlign: 'middle', color: '#3b82f6' }}>verified</span>}
                </span>
                <span className="user-subtitle">
                  {user.verified ? "Admin" : (user.title || "Model")}
                </span>
              </div>
            </div>
            <div className="dropdown-content1">
              <div className="dropdown-header">Profile Options</div>
              <AvatarUpload user={user} pb={pb} setUser={setUser} />
              <div className="visibility-toggle" onClick={(e) => e.stopPropagation()}>
                <span className="toggle-label">Public Profile</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={user.public || false}
                    onChange={toggleVisibility}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div onClick={() => { pb.authStore.clear(); setUser(null); }} className='logout-container'>
                <span>Logout</span><span className="material-symbols-outlined ">logout</span>
              </div>
            </div>
          </div>

          {/* FIX: Dropdown now uses filterOpen state and onClick */}
          <div
            className={`dropdown ${filterOpen ? 'active' : ''}`}
            onMouseEnter={() => setFilterOpen(true)}
            onMouseLeave={() => setFilterOpen(false)}
          >
            <button className="main-button" onClick={() => setFilterOpen(!filterOpen)}>
              {getTitle()} <span className="material-symbols-outlined">expand_more</span>
            </button>
            <div className="dropdown-content">
              <div className={`dropdown-item ${viewingUser === user.id ? 'active' : ''}`} onClick={() => handleSelectUser(user.id)}>My Photos</div>
              <div className="dropdown-divider"></div>
              {userList.filter(u => u.id !== user.id).map(u => (
                <div key={u.id} className={`dropdown-item ${viewingUser === u.id ? 'active' : ''}`} onClick={() => handleSelectUser(u.id)}>{u.name || u.email}</div>
              ))}
              <div className="dropdown-divider"></div>
              <div className={`dropdown-item ${!viewingUser ? 'active' : ''}`} onClick={() => handleSelectUser(null)}>View All</div>
            </div>
          </div>

          <div className="header-actions">
            <label className="upload-btn">
              {uploading ? <div className="spinner" style={{ width: 18, height: 18, borderTopColor: 'black' }}></div> : <span className="material-symbols-outlined">add</span>}
              <input type="file" onChange={handleUpload} multiple style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>
        </div>
      </header>

      {grid}

      <AnimatePresence>
        {photoToDelete && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPhotoToDelete(null)}>
            <motion.div className="delete-modal" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
              <h3 className='modal-title'>Delete Photo?</h3>
              <p style={{ marginBottom: 20, color: '#aaa' }}>This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10, width: '100%', justifyContent: 'center' }}>
                <button className="modal-btn cancel" onClick={() => setPhotoToDelete(null)}>Cancel</button>
                <button className="modal-btn delete" onClick={confirmDelete}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} custom={direction}>
        {selectedPhoto && (
          <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeLightbox}>
            <div className="responsive-container" onClick={e => e.stopPropagation()}>

              <ProgressiveImage
                key={selectedPhoto.id} photo={selectedPhoto} direction={direction}
                onClose={closeLightbox}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  const swipeY = swipePower(offset.y, velocity.y);

                  if (swipe < -swipeConfidenceThreshold) {
                    changePhoto(1);
                  } else if (swipe > swipeConfidenceThreshold) {
                    changePhoto(-1);
                  } else if (offset.y > 100 || (offset.y > 50 && swipeY > swipeConfidenceThreshold)) {
                    closeLightbox();
                  }
                }}
              />

              <div className="lightbox-header">
                <a href={pb.files.getURL(selectedPhoto, selectedPhoto.image) + "?download=1"} className="icon-btn" download><span className="material-symbols-outlined">download</span></a>
                <button className="icon-btn" onClick={(e) => { e.stopPropagation(); closeLightbox(); }}><span className="material-symbols-outlined">close</span></button>
              </div>

              <button className="nav-btn left" onClick={(e) => { e.stopPropagation(); changePhoto(-1) }}><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="nav-btn right" onClick={(e) => { e.stopPropagation(); changePhoto(1) }}><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App