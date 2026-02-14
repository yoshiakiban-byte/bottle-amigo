# Bottle Amigo Consumer - Quick Start Guide

## Installation & Setup

No installation needed! This is a static HTML + JavaScript application.

### Prerequisites
- BFF API running on http://localhost:3001 (already tested)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- For QR scanning: Camera access permission

### Running the App

#### Option 1: Python
```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/consumer
python3 -m http.server 8000
# Open http://localhost:8000
```

#### Option 2: Node.js
```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/consumer
npx http-server
# Open http://localhost:8080
```

#### Option 3: Any static file server
Serve the `consumer` directory as static files on any HTTP server.

## Usage Flow

### 1. Registration
- Click "こちら" (here) link on login page
- Enter name, email, password
- Click "登録" (register)
- Auto-redirects to home page

### 2. Home Page (ホーム)
- View your bottles as cards
- Each card shows:
  - Store name
  - Bottle type
  - Remaining percentage with progress bar
  - Shared status badges
- Click any card to view bottle details

### 3. Bottle Detail
- Large circular progress indicator
- Share button (シェア)
- Back button to return to list

### 4. Check-in (チェックイン)
- **QR Tab**: Point camera at QR code
- **Manual Tab**: Enter store ID and click search
- Select amigos to notify (checkboxes)
- Click "チェックイン" (checkin)
- See success message

### 5. Amigos (Amigo)
- Select store from dropdown
- View accepted amigos and pending requests
- Click "承認" (accept) to accept pending requests
- Click "Amigo申請" (request amigo) to search and add new amigos
- Type user name and click "検索" (search)

### 6. Share Bottle
- From bottle detail, click "シェア" (share)
- Select amigo to share with
- Confirm sharing
- Returns to bottle detail

### 7. Notifications (通知)
- View all notifications (newest first)
- Icons indicate notification type:
  - 🍻 Amigo check-in
  - 📢 Store post
  - 🎁 Bottle share
  - 🥃 Bottle gift from store
  - 👥 Amigo request
- Unread notifications are bold with a dot

## Features

### Authentication
- Email/password login
- Name/email/password registration
- JWT tokens stored in browser
- Auto-logout on 401 response

### Bottle Management
- View personal bottles
- See bottle type and remaining percentage
- Color-coded progress:
  - Green: > 50% remaining
  - Yellow: 25-50% remaining
  - Red: < 25% remaining
- View shared status

### Check-in System
- QR code scanning (via camera)
- Manual store ID entry
- Notify selected amigos
- Real-time confirmation

### Amigo Network
- Request amigos at specific stores
- Accept/reject amigo requests
- Filter amigos by store
- Search users by name

### Bottle Sharing
- Share bottles with amigos
- Only share with amigos at same store
- Confirmation before sharing

### Notifications
- Real-time notification feed
- Unread count badge
- Detailed information per notification
- Relative time display

### Bottom Navigation
- Fixed navigation bar
- 4 main sections (Home, Check-in, Amigos, Notifications)
- Active indicator
- Unread count on notifications bell

## API Integration

The app automatically communicates with:
- **Base URL**: http://localhost:3001
- **Headers**: Authorization: Bearer {token}
- **Error Handling**: 401 redirects to login, errors show as toasts

All endpoints implemented:
- POST /auth/user/register
- POST /auth/user/login
- GET /consumer/bottles
- GET /consumer/bottles/{id}
- GET /consumer/stores/{id}
- POST /consumer/checkins
- GET /consumer/amigos
- POST /consumer/amigos/request
- POST /consumer/amigos/{id}/accept
- POST /consumer/shares
- POST /consumer/shares/{id}/end
- GET /consumer/notifications
- GET /consumer/users/search

## Keyboard Shortcuts & Navigation

- Click card to view detail
- Back button (← 戻る) to return
- Bottom nav for main sections
- Hash-based URLs (#/home, #/checkin, etc.)

## Troubleshooting

### White screen?
- Check browser console (F12)
- Verify BFF is running on http://localhost:3001
- Check JavaScript for errors

### Can't login?
- Verify BFF API is running
- Check credentials match registered account
- Clear browser localStorage and try again

### QR scanning not working?
- Check camera permissions
- Try manual entry on checkin page
- Verify browser supports Camera API

### Notifications not updating?
- Refresh page
- Check BFF is sending notifications
- Verify amigos are at correct stores

## Development Notes

### Adding New Pages
1. Create new module in `js/` (e.g., `js/newpage.js`)
2. Export render function
3. Import in `app.js`
4. Add route in `router()` method
5. Export handler functions if needed

### Modifying Styles
- Edit `css/style.css`
- Uses CSS variables for colors
- Mobile-first responsive design
- Tailwind CSS utility classes available

### Debugging
- Use browser DevTools (F12)
- Check Network tab for API calls
- Check Console for JavaScript errors
- Check Application > LocalStorage for token

### Testing API Calls
Use curl or Postman to test endpoints:
```bash
curl -X POST http://localhost:3001/auth/user/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## File Structure Reminder

```
consumer/
├── index.html           # Entry point
├── css/
│   └── style.css       # Styling
├── js/
│   ├── app.js          # Router & initialization
│   ├── api.js          # API client
│   ├── auth.js         # Login/register
│   ├── bottles.js      # Bottles
│   ├── stores.js       # Stores
│   ├── checkin.js      # Check-in
│   ├── amigos.js       # Amigos
│   ├── shares.js       # Sharing
│   └── notifications.js# Notifications
├── README.md           # Full documentation
├── ARCHITECTURE.md     # Architecture details
└── QUICK_START.md      # This file
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires:
  - ES6 modules
  - Fetch API
  - localStorage
  - Camera API (for QR)

## Performance

- No build step: Code runs as-is
- ~2000 lines of code total
- ~30 KB minified (with Tailwind)
- Fast initial load
- Responsive UI with smooth animations

## License & Credits

Built for Bottle Amigo system with:
- Vanilla JavaScript (ES modules)
- Tailwind CSS (CDN)
- html5-qrcode (CDN)
- Fetch API for HTTP
- localStorage for persistence

No external dependencies or npm packages required!
