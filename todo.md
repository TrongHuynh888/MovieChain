# Rạp Chiếu Phim Blockchain - Development Plan

## Design Guidelines

### Design References

- **Netflix**: Dark theme, card-based layout, smooth hover effects
- **Cyberpunk 2077**: Neon accents, futuristic feel, gradient effects
- **Style**: Dark Mode Primary + Neon Cyberpunk Accents

### Color Palette

- Primary Background: #0a0a0f (Deep Dark)
- Secondary Background: #1a1a2e (Card Background)
- Accent Primary: #e50914 (Netflix Red)
- Accent Secondary: #00d4ff (Cyan Neon)
- Accent Tertiary: #ff00ff (Magenta Neon)
- Text Primary: #ffffff
- Text Secondary: #b0b0b0
- Success: #00ff88
- Warning: #ffaa00

### Typography

- Heading: 'Orbitron', sans-serif (Cyberpunk feel)
- Body: 'Roboto', sans-serif
- Accent: 'Rajdhani', sans-serif

### Key Component Styles

- Cards: Glassmorphism effect, neon border on hover
- Buttons: Gradient backgrounds, glow effect on hover
- Inputs: Dark background, neon border focus
- Modals: Backdrop blur, centered with animation

---

## File Structure

```
/workspace/app/frontend/
├── index.html          # Main HTML với tất cả pages
├── style.css           # CSS styles với Dark/Light theme
├── app.js              # Main application logic
├── firebase-config.js  # Firebase configuration
├── web3-config.js      # Web3/Ethers.js configuration
└── README.md           # Hướng dẫn setup
```

## Development Tasks

### Task 1: Firebase Config & Setup

- [x] Tạo firebase-config.js với hướng dẫn
- [x] Cấu trúc Firestore collections

### Task 2: Main HTML Structure

- [x] Navigation với theme toggle
- [x] Auth modals (Login/Register)
- [x] Home page với movie grid
- [x] Movie detail page
- [x] Admin dashboard

### Task 3: Authentication System

- [x] Firebase Auth integration
- [x] Login/Register forms
- [x] Admin role detection

### Task 4: Movie Detail & Video Player

- [x] Movie info display
- [x] Locked video overlay
- [x] Unlock after payment

### Task 5: Comments & Rating

- [x] Comment form
- [x] Rating system (1-10)
- [x] Display comments list

### Task 6: Admin Dashboard

- [x] Statistics overview
- [x] CRUD movies
- [x] Manage episodes
- [x] Manage categories/countries/years
- [x] Manage users
- [x] Manage comments

### Task 7: Web3 Integration

- [x] Metamask connection
- [x] CRO payment on Cronos
- [x] Transaction verification

### Task 8: Responsive CSS

- [x] Dark/Light theme
- [x] Mobile responsive
- [x] Animations & effects
