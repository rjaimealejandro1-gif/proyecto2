import React, { useState } from 'react';
import '../styles/StackedGallery.css';

// User's exact requested images in the requested order
const images = [
  '/myfamily.png',
  '/Mylove.png',
  '/Mylove2.png',
  '/Fotoamigos.png',
  '/amigo.png',
  '/vale.png',
  '/mia.png',
  '/fotomia.png'
];

const StackedGallery = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      prevImage();
    }
  };

  return (
    <div className="gallery-container">
      <div className="simple-gallery-wrapper">
        <div 
          className="simple-gallery-image-container"
          onTouchStart={onTouchStart} 
          onTouchMove={onTouchMove} 
          onTouchEnd={onTouchEnd}
        >
          <img 
            src={images[currentIndex]} 
            alt={`Galeria ${currentIndex}`} 
            className="simple-gallery-img" 
            loading="lazy"
          />
        </div>
      </div>
      <div className="gallery-nav">
        <button onClick={prevImage} className="nav-arrow" aria-label="Imagen anterior">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <button onClick={nextImage} className="nav-arrow" aria-label="Imagen siguiente">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default StackedGallery;
