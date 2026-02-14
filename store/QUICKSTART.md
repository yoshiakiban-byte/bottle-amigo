# Bottle Amigo Store Frontend - Quick Start Guide

## Prerequisites
- BFF API server running at `http://localhost:3001`
- Web browser with ES6 support (Chrome, Safari, Firefox, Edge)

## Installation & Running

### Option 1: Simple HTTP Server (Python 3)
```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store
python -m http.server 8000
```
Then open: `http://localhost:8000`

### Option 2: Node.js http-server
```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store
npx http-server
```

### Option 3: Direct File Open
Simply open `/sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store/index.html` in your browser

## First Login

1. **Store ID**: `store_001` (default)
2. **PIN**: `1234` (4 digits - configure in your BFF)

After successful login, you'll see the Dashboard with active check-ins.

## Pages Overview

### Dashboard (Home)
- View all customers currently checked in
- See their bottles and remaining percentages
- Quick access to customer details
- Auto-refreshes every 30 seconds
- Button to end check-ins

### Customer Details
- View customer information
- Edit bottle remaining percentages with slider
- View/add memos
- Refill bottles to full (mama only)
- Add new bottles (mama only)

### Store Posts
- Create announcements for staff
- Types: Staff Introduction, Quick Note, Event
- Events can have titles
- Visible to all customers when posted

### Gift Campaign (Mama Only)
- Search for dormant customers
- Select their bottle
- Send a gift percentage (1-20%)
- Provide reason for gift

## Features by Role

### Bartender (バーテンダー)
- View check-ins and customer details
- Update bottle remaining percentages
- Add memos to customer profiles
- Create and view posts
- View customer gift history

### Mama (ママ)
- All bartender features PLUS:
- Refill bottles to 100%
- Add new bottles for customers
- Send gifts to dormant customers
- Full access to all admin features

## UI Layout

### iPad (Landscape/Portrait)
- Left sidebar with navigation
- Full-width content area
- Optimized for touch
- Responsive cards

### Mobile Phones
- Bottom navigation bar
- Hamburger menu toggle
- Full-screen content
- Touch-optimized buttons

## Key Keyboard Shortcuts

- `Enter` - Submit forms
- `Esc` - Close modals/menus
- Tab navigation - Full keyboard support

## Troubleshooting

### "Cannot connect to API"
- Verify BFF server is running at `http://localhost:3001`
- Check browser console for specific errors
- Ensure API CORS is configured

### "Unauthorized (401)"
- Your token may have expired
- Click logout and log in again
- Check localStorage is enabled

### Mama features not showing
- Confirm your PIN corresponds to a mama account
- Clear localStorage and log back in
- Check BFF returns correct `role: "mama"`

### Page not refreshing
- Check browser console for JavaScript errors
- Verify API endpoints return correct data format
- Try refreshing the page (F5)

## API Response Format

The app expects specific response structures from the BFF:

**Check-ins**
```json
{
  "checkins": [
    {
      "id": "checkin_123",
      "userId": "user_456",
      "userName": "田中太郎",
      "checkinTime": "2024-01-15T19:30:00Z",
      "bottles": [
        {
          "id": "bottle_789",
          "type": "焼酎",
          "remainingPct": 45,
          "sharedWith": []
        }
      ]
    }
  ]
}
```

**Customer Summary**
```json
{
  "customer": {
    "id": "user_456",
    "name": "田中太郎",
    "email": "tanaka@example.com"
  },
  "bottles": [...],
  "memos": [
    {
      "id": "memo_123",
      "staffName": "スタッフA",
      "body": "いつもありがとうございます",
      "createdAt": "2024-01-15T20:00:00Z"
    }
  ]
}
```

## Customization

### Change API URL
Edit `js/api.js` line 4:
```javascript
const API_BASE_URL = 'http://your-api-url:port';
```

### Change Default Store ID
Edit `js/auth.js` line 18:
```javascript
storeIdInput.value = 'your_store_id';
```

### Change Colors
Edit `css/style.css` lines 7-12:
```css
:root {
    --primary: #YOUR-COLOR;
    --primary-dark: #YOUR-DARK-COLOR;
    --light: #YOUR-LIGHT-COLOR;
    --card: #YOUR-CARD-COLOR;
}
```

## Files Structure

```
store/
├── index.html           # Main HTML template
├── css/
│   └── style.css       # All custom styles
├── js/
│   ├── app.js          # Router & main app
│   ├── api.js          # API client
│   ├── auth.js         # Login & auth
│   ├── checkins.js     # Check-in list
│   ├── customer.js     # Customer details
│   ├── bottles.js      # Bottle utilities
│   ├── posts.js        # Posts feature
│   └── gifts.js        # Gift campaign
├── README.md           # Full documentation
└── QUICKSTART.md       # This file
```

## Performance Tips

1. Use iPad or modern browser for best experience
2. Keep BFF API server responsive
3. Limit to 100 active check-ins for optimal performance
4. Clear browser cache if styles/JS not updating

## Common Tasks

### How to logout?
Click the "ログアウト" button in the sidebar (or menu on mobile)

### How to check customer history?
Click on a customer name from the check-in list to view their full profile

### How to send a gift?
1. Go to "休眠施策" (Gift Campaign)
2. Search and select customer
3. Choose their bottle
4. Set gift amount (1-20%)
5. Add reason
6. Click "プレゼントを送る"

### How to add a memo?
1. Go to customer details
2. Scroll to "メモ" section
3. Type message
4. Click "メモ追加"

### How to create a post?
1. Go to "店投稿" (Store Posts)
2. Select post type
3. Add title (if event)
4. Write content
5. Click "投稿"

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Review BFF API response format
3. Verify network connectivity
4. Check README.md for detailed documentation

Happy staffing!
