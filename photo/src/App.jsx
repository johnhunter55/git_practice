import { useState, useEffect } from 'react'
import PocketBase from 'pocketbase'
import Auth from './Auth'
import './App.css'

const pb = new PocketBase('http://127.0.0.1:8090')

function App() {
  const [user, setUser] = useState(pb.authStore.model)
  const [photos, setPhotos] = useState([])
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  function logout() {
    pb.authStore.clear()
    setUser(null)
  }

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

  return (
    <div className="gallery-container">

      {user && (
        <header>
          {/* Fixed 'class' to 'className' for React */}
          <button className="material-symbols-outlined">menu</button>
          <h1>My Photo Gallery</h1>
          <button onClick={logout} className="logout-btn material-symbols-outlined">logout</button>
        </header>
      )}

      {user ? (
        <>
          <div className="photo-grid">
            {photos.map((photo) => {
              const thumbUrl = pb.files.getUrl(photo, photo.image, { 'thumb': '480x0' })

              return (
                <div
                  key={photo.id}
                  className="photo-card"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img src={thumbUrl} alt="Gallery Thumbnail" loading="lazy" />
                </div>
              )
            })}
          </div>

          {/* --- NEW LIGHTBOX CODE STARTS HERE --- */}
          {/* ... inside App function ... */}

          {selectedPhoto && (() => {
            const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id)
            const nextPhoto = photos[(currentIndex + 1) % photos.length]
            const prevPhoto = photos[(currentIndex - 1 + photos.length) % photos.length]

            return (
              <div className="lightbox" onClick={() => setSelectedPhoto(null)}>

                {/* Content Box */}
                <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>

                  {/* NEW: Wrapper makes buttons stick to the image size */}
                  <div className="image-wrapper">

                    <img
                      src={pb.files.getUrl(selectedPhoto, selectedPhoto.image)}
                      alt="Full Screen"
                    />

                    {/* 1. TOP RIGHT ICONS (Show when hovering anywhere on photo) */}
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

                    {/* 2. LEFT ARROW (Shows only when hovering Left Side) */}
                    <button
                      className="nav-btn left"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPhoto(prevPhoto)
                      }}
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    {/* 3. RIGHT ARROW (Shows only when hovering Right Side) */}
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