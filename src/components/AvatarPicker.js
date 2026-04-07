import React from 'react';
import './AvatarPicker.css';

const AVATAR_SEEDS = [
  { id: 'Felix', name: 'Félix' },
  { id: 'Aneka', name: 'Aneka' },
  { id: 'Julian', name: 'Julián' },
  { id: 'Sophie', name: 'Sophie' },
  { id: 'Casper', name: 'Casper' },
  { id: 'Lily', name: 'Lily' },
  { id: 'Oliver', name: 'Oliver' },
  { id: 'Elena', name: 'Elena' },
];

const AvatarPicker = ({ selectedAvatar, onSelect }) => {
  return (
    <div className="avatar-picker-container">
      <label className="form-label">Elige tu foto de perfil</label>
      <div className="avatar-grid">
        {AVATAR_SEEDS.map((seed) => {
          const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed.id}`;
          return (
            <div
              key={seed.id}
              className={`avatar-item ${selectedAvatar === url ? 'selected' : ''}`}
              onClick={() => onSelect(url)}
              title={seed.name}
            >
              <img src={url} alt={`Avatar ${seed.name}`} />
              <div className="avatar-check">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarPicker;
