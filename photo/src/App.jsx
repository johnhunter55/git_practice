import { useState, useEffect } from 'react'
import PocketBase from 'pocketbase'
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Auth from './Auth'
import './App.css'

// 1. Initialize PocketBase
const pb = new PocketBase('http://127.0.0.1:8090')

function App() {
  const [user, setUser] = useState(pb.authStore.model)
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  function logout() {
    pb.authStore.clear()
    setUser(null)
  }

  // 2. Fetch photos from PocketBase
  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      try {
        const result = await pb.collection('photos').getList(1, 50, {
          sort: '-created',
        });
        setPhotos(result.items)
      } catch (err) {
        console.error(err)
      }
    }
    fetchData()
  }, [user])

  // 3. Transform PocketBase data for the Album library
  // We explicitly create this array so the library understands your data
  const albumPhotos = photos.map(photo => ({
    src: pb.files.getUrl(photo, photo.image),
    // Since we don't have real dimensions in the DB yet, we use a placeholder.
    // Masonry handles this better than Rows, but it will look like a strict grid
    // until you save real width/height data.
    width: 400,
    height: 400,
    original: photo // Keep the original object for the Lightbox
  }));

  return (
    <div className="gallery-container">
      {user && (
        <header>
          <button className="material-symbols-outlined">menu</button>
          <h1>My Photo Gallery</h1>
          <button onClick={logout} className="logout-btn material-symbols-outlined">logout</button>
        </header>
      )}

      {user ? (
        <>
          <div className="photo-grid-container">
            {/* 4. THE MASONRY ALBUM */}
            <MasonryPhotoAlbum
              photos={albumPhotos}
              columns={(containerWidth) => {
                // This makes the columns dynamic based on screen size
                if (containerWidth < 400) return 1;
                if (containerWidth < 800) return 2;
                return 3;
              }}
              spacing={10}
              onClick={({ event, photo }) => {
                setSelectedPhoto(photo.original)
              }}
            />
          </div>

          {/* 5. Lightbox (Full Screen View) */}
          {selectedPhoto && (() => {
            const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
            const nextPhoto = photos[(currentIndex + 1) % photos.length]
            const prevPhoto = photos[(currentIndex - 1 + photos.length) % photos.length]

            return (
              <div className="lightbox" onClick={() => setSelectedPhoto(null)}>
                <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                  <div className="image-wrapper">
                    <img
                      src={pb.files.getUrl(selectedPhoto, selectedPhoto.image)}
                      alt="Full Screen"
                    />

                    <div className="lightbox-header">
                      <a
                        href={pb.files.getUrl(selectedPhoto, selectedPhoto.image) + "?download=1"}
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
                        setSelectedPhoto(prevPhoto)
                      }}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    <button
                      className="nav-btn right"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPhoto(nextPhoto)
                      }}
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      ) : (
        <Auth pb={pb} onLogin={setUser} />
      )}
    </div>
  )
}

export default App