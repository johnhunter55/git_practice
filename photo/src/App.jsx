import { useState, useEffect } from 'react'
import PocketBase from 'pocketbase'
import { motion, AnimatePresence } from "framer-motion";
import Auth from './Auth'
import './App.css'

// Initialize PocketBase
const pb = new PocketBase('http://127.0.0.1:8090')
pb.autoCancellation(false);

// Animation Config
const variants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
    scale: 0.8
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset, velocity) => {
  return Math.abs(offset) * velocity;
};

function App() {
  const [user, setUser] = useState(pb.authStore.model)
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)

  const [[page, direction], setPage] = useState([0, 0]);

  const [userList, setUserList] = useState([])
  const [viewingUser, setViewingUser] = useState(null)

  function logout() {
    pb.authStore.clear()
    setUser(null)
    setViewingUser(null)
  }

  // 1. Fetch Users
  useEffect(() => {
    if (!user) return;
    async function fetchUsers() {
      try {
        const result = await pb.collection('users').getList(1, 100);
        setUserList(result.items);
        setViewingUser(user.id);
      } catch (err) {
        console.error("Could not fetch users:", err);
      }
    }
    fetchUsers();
  }, [user]);

  // 2. Fetch Photos
  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const filter = viewingUser ? `owner = "${viewingUser}"` : '';
        const result = await pb.collection('photos').getList(1, 50, {
          sort: '-created',
          filter: filter,
          expand: 'owner'
        });
        setPhotos(result.items)
      } catch (err) {
        console.error("Could not fetch photos:", err);
      }
    }
    fetchData()
  }, [user, viewingUser])

  // 3. Change Photo Logic
  const changePhoto = (newDir) => {
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    let nextIndex = currentIndex + newDir;

    if (nextIndex < 0) nextIndex = photos.length - 1;
    if (nextIndex >= photos.length) nextIndex = 0;

    setPage([page + newDir, newDir]);
    setSelectedPhoto(photos[nextIndex]);
  };

  // 4. Bulk Upload Function
  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = files.map((file) => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('owner', user.id);
        return pb.collection('photos').create(formData);
      });

      await Promise.all(uploadPromises);
      window.location.reload();

    } catch (err) {
      console.error("Upload failed:", err);
      alert("Some uploads failed. Check console.");
    } finally {
      setUploading(false);
    }
  };

  // --- NEW: LOGIC TO GET THE TITLE ---
  // We look through userList to find the name of the person we are watching
  const getCurrentTitle = () => {
    if (viewingUser === user.id) return "My Photo Gallery";
    if (viewingUser === null) return "All Photos";

    // Find the user object in our list
    const foundUser = userList.find(u => u.id === viewingUser);

    // If found, return "John's Gallery", otherwise fallback
    if (foundUser) {
      // Use name if they have one, otherwise username or email
      const displayName = foundUser.name || foundUser.username || foundUser.email;
      return `${displayName}'s Photos`;
    }

    return "User Gallery";
  };
  // ------------------------------------

  return (
    <div className="gallery-container">
      {user && (
        <header>
          <div className="header">
            <button className="material-symbols-outlined">menu</button>
            <div className="dropdown">
              <button className="main-button">
                {/* USE THE NEW FUNCTION HERE */}
                {getCurrentTitle()}
                <span className="material-symbols-outlined" style={{ fontSize: '1rem', marginLeft: '5px' }}>arrow_drop_down</span>
              </button>

              <div className="dropdown-content">
                <div className="dropdown-header">Filter by User</div>

                {/* My Photos Option */}
                <div
                  className={`dropdown-item ${viewingUser === user.id ? 'active' : ''}`}
                  onClick={() => setViewingUser(user.id)}
                >
                  My Photos
                </div>

                {/* Separator */}
                <div className="dropdown-divider"></div>

                {/* Other Users */}
                {userList.filter(u => u.id !== user.id).map(u => (
                  <div
                    key={u.id}
                    className={`dropdown-item ${viewingUser === u.id ? 'active' : ''}`}
                    onClick={() => setViewingUser(u.id)}
                  >
                    {u.name || u.username || u.email}
                  </div>
                ))}

                {/* View All Option */}
                <div className="dropdown-divider"></div>
                <div
                  className={`dropdown-item ${viewingUser === null ? 'active' : ''}`}
                  onClick={() => setViewingUser(null)}
                >
                  View All
                </div>
              </div>
            </div>


            <div className="header-actions">
              <label className="upload-btn">
                {uploading ? "..." : <span className="material-symbols-outlined">add_a_photo</span>}
                <input
                  type="file"
                  onChange={handleUpload}
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
              </label>
              <button onClick={logout} className="logout-btn material-symbols-outlined">logout</button>
            </div>
          </div>

        </header>
      )}

      {user ? (
        <>
          <div className="masonry-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="masonry-item">
                <img
                  src={pb.files.getURL(photo, photo.image)}
                  alt=""
                  loading="lazy"
                  className="photo-img"
                  onClick={() => {
                    setPage([page + 1, 1]);
                    setSelectedPhoto(photo)
                  }}
                />
              </div>
            ))}
          </div>

          <AnimatePresence initial={false} custom={direction}>
            {selectedPhoto && (
              <motion.div
                className="lightbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPhoto(null)}
              >
                <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                  <div className="image-wrapper">
                    <motion.img
                      key={selectedPhoto.id}
                      src={pb.files.getURL(selectedPhoto, selectedPhoto.image)}
                      custom={direction}
                      variants={variants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                      }}
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      onDragEnd={(e, { offset, velocity }) => {
                        const swipe = swipePower(offset.y, velocity.y);
                        if (swipe > swipeConfidenceThreshold) {
                          setSelectedPhoto(null);
                        }
                      }}
                      alt="Full Screen"
                    />

                    <div className="lightbox-header">
                      <a
                        href={pb.files.getURL(selectedPhoto, selectedPhoto.image) + "?download=1"}
                        className="icon-btn"
                        download
                        title="Download"
                      >
                        <span className="material-symbols-outlined">download</span>
                      </a>
                      <button className="icon-btn" onClick={() => setSelectedPhoto(null)}>
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </div>

                    <button
                      className="nav-btn left"
                      onClick={(e) => {
                        e.stopPropagation()
                        changePhoto(-1)
                      }}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    <button
                      className="nav-btn right"
                      onClick={(e) => {
                        e.stopPropagation()
                        changePhoto(1)
                      }}
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <Auth pb={pb} onLogin={setUser} />
      )}
    </div>
  )
}

export default App