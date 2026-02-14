# Bottle Amigo - Store Staff Frontend

A fully-functional iPad-optimized single-page application (SPA) for Bottle Amigo store staff management. Built with vanilla JavaScript, Tailwind CSS CDN, and Fetch API - zero npm dependencies.

## Features

### Core Functionality
- **Staff Authentication**: PIN-based login with store ID
- **Active Check-ins Dashboard**: Real-time list of customers currently at the store
- **Customer Details**: View and manage customer information, bottles, and memos
- **Bottle Management**: Update remaining percentages, refill to full, add new bottles
- **Store Posts**: Create and display staff introductions, announcements, and events
- **Gift Campaign**: Send bottle gifts to dormant customers (mama-only feature)

### Technical Highlights
- **No Build Process**: Works entirely in browser, no npm packages required
- **Hash-Based Routing**: Single-page app navigation without server routes
- **JWT Authentication**: Secure token-based staff authentication
- **Responsive Design**: Optimized for iPad (landscape/portrait), with mobile fallback
- **Japanese UI**: Complete Japanese localization
- **Auto-Refresh**: Dashboard updates every 30 seconds
- **Role-Based Features**: Papa/Bartender features hidden from non-mama staff
- **Toast Notifications**: User feedback for actions and errors

## Project Structure

```
store/
├── index.html              # Main HTML with all page templates
├── css/
│   └── style.css          # Custom styles and animations
└── js/
    ├── app.js             # SPA router and app controller
    ├── api.js             # API client wrapper
    ├── auth.js            # Staff login and auth management
    ├── checkins.js        # Active checkins module
    ├── customer.js        # Customer detail view
    ├── bottles.js         # Bottle utilities
    ├── posts.js           # Store posts module
    └── gifts.js           # Bottle gift campaign module
```

## Usage

### Starting the App

1. Ensure the BFF API server is running at `http://localhost:3001`
2. Open `/sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store/index.html` in a browser
3. Log in with:
   - Store ID: `store_001` (default, can be changed)
   - PIN: 4 digits (e.g., `1234`)

### Navigation

The app uses hash-based routing:
- `#/login` - Staff login page
- `#/dashboard` - Active check-ins (default after login)
- `#/customers/{userId}` - Customer detail view
- `#/posts` - Store post creation
- `#/gifts` - Bottle gift campaign (mama only)

### Sidebar Navigation (iPad)
Left sidebar available on screens 1024px and wider:
- 🏠 来店一覧 (Active Check-ins)
- 📝 店投稿 (Store Posts)
- 🎁 休眠施策 (Gift Campaign - mama only)
- ログアウト (Logout)

Mobile devices use bottom navigation bar instead.

## Architecture

### Authentication Flow
1. User enters Store ID and PIN
2. API POST to `/auth/staff/login` returns JWT token and staff info
3. Token stored in `localStorage` as `bottle_amigo_staff_token`
4. Staff info stored in `localStorage` as `bottle_amigo_staff`
5. All API requests include `Authorization: Bearer {token}` header
6. 401 responses redirect to login page

### Page Modules

Each major feature has its own module:

**api.js**
- Centralized API client
- Auto-adds auth token to all requests
- Handles 401 unauthorized responses
- Methods for all BFF endpoints

**auth.js**
- Login form handling
- Token storage/retrieval
- Role-based UI element visibility
- Session persistence

**checkins.js**
- Fetches and displays active check-ins
- Shows customer names, check-in times, bottles
- Auto-refresh every 30 seconds
- Quick exit buttons for ending visits

**customer.js**
- Loads customer summary (info, bottles, memos)
- Bottle remaining % slider with save
- Memo viewing and creation
- New bottle creation (mama only)
- Refill to full (mama only)

**bottles.js**
- Utility functions for bottle operations
- Validates remaining percentage input
- Enforces mama-only operations

**posts.js**
- Post creation form with type selector
- Dynamic title field for events
- Form clearing on successful post

**gifts.js**
- Customer search and selection
- Bottle selection from customer's collection
- Add percentage slider (1-20%)
- Reason text input
- Gift sending via API

### Styling

**Colors**
- Primary: `#4F46E5` (indigo-600)
- Dark: `#3730A3` (indigo-900)
- Light: `#F9FAFB` (gray-50)
- Cards: `#F3F4F6` (gray-100)

**Responsive Design**
- Sidebar: Hidden on mobile (<1024px), visible on iPad/desktop
- Bottom nav: Only on mobile
- Touch targets: 44px minimum height for iOS
- Font size: 16px base to prevent zoom on iOS input focus

**Custom Elements**
- Progress bars for bottle remaining %
- Range sliders with custom styling
- Toast notifications with animations
- Smooth page transitions

## API Integration

### Endpoints Used

**Authentication**
```
POST /auth/staff/login
  Request: { storeId: string, pin: string }
  Response: { token: string, staff: { staffId, storeId, name, role, type } }
```

**Check-ins**
```
GET /store/checkins/active?storeId={id}
  Response: { checkins: [...] }

POST /store/checkins/{id}/end
  Request: { storeId: string }
```

**Customer**
```
GET /store/customers/{userId}/summary?storeId={id}
  Response: { customer: {...}, bottles: [...], memos: [...] }

POST /store/memos
  Request: { storeId, userId, body }
```

**Bottles**
```
POST /store/bottles/{id}/updateRemainingPct
  Request: { storeId, remainingPct: number }

POST /store/bottles/{id}/refillToFull
  Request: { storeId }

POST /store/bottles/addNew
  Request: { storeId, ownerUserId, type }
```

**Posts**
```
POST /store/posts
  Request: { storeId, type, body, title? }
```

**Gifts**
```
POST /store/gifts
  Request: { storeId, targetUserId, bottleId, addPct, reason }
```

## Browser Compatibility

- Modern browsers with ES6 support
- Fetch API
- localStorage
- CSS Grid/Flexbox
- CSS Custom Properties

Tested on:
- Safari (iOS/iPad)
- Chrome (Desktop/Mobile)
- Firefox

## Development

### Adding New Features

1. Create a new module file in `js/` directory
2. Initialize the module in `app.js` or when needed
3. Update routing in `app.js` `handleRoute()` if adding a new page
4. Add page template to `index.html` with id matching the page view
5. Add navigation link to sidebar/mobile nav
6. Style using Tailwind classes and custom CSS

### Debugging

Browser console shows:
- API request/response details
- Module initialization
- Navigation events
- Error messages

Check `localStorage`:
- `bottle_amigo_staff_token` - JWT token
- `bottle_amigo_staff` - Staff info JSON

### Common Issues

**Blank page after login?**
- Check browser console for errors
- Verify API base URL is correct in `api.js`
- Ensure BFF server is running

**Mama-only features showing for bartenders?**
- Clear localStorage and re-login
- Check staff role returned from API

**Auto-refresh not working?**
- Check network tab for API calls
- Verify checkins endpoint response format

## Customization

### Change API Base URL
Edit `/js/api.js` line 3:
```javascript
const API_BASE_URL = 'http://localhost:3001';
```

### Change Colors
Edit `/css/style.css` CSS variables:
```css
:root {
    --primary: #4F46E5;
    --primary-dark: #3730A3;
    --light: #F9FAFB;
    --card: #F3F4F6;
}
```

### Change Store ID Default
Edit `/js/auth.js` in `setupLoginForm()`:
```javascript
storeIdInput.value = 'store_001';
```

### Change Refresh Interval
Edit `/js/checkins.js` line 72:
```javascript
this.refreshInterval = setInterval(() => {
    this.loadCheckins();
}, 30000); // Change 30000 to desired milliseconds
```

## Performance

- No build step: instant file serving
- Minimal DOM manipulation: efficient updates
- Efficient API calls: only what's needed
- CSS optimized via Tailwind CDN
- Single main JavaScript entry point after auth

## Accessibility

- Semantic HTML structure
- ARIA labels where needed
- Keyboard navigation support
- Focus states on all interactive elements
- Sufficient color contrast ratios
- Japanese language support

## Security

- JWT token-based authentication
- Secure token storage (localStorage)
- Authorization headers on all requests
- Server enforces role-based access
- 401 redirects to login on token expiry
- Input validation on client side
- XSS protection via DOM methods

## Mobile Optimization

- Touch-friendly button sizes (min 44px)
- Prevent zoom on input focus (font-size: 16px)
- Landscape/portrait support
- Bottom navigation for mobile
- Sidebar collapse on small screens
- Optimized font sizes for different screens
- Prevent pull-to-refresh on iOS

## Deployment

Simply serve the `/store/` directory as static files:

```bash
# Using Python
python -m http.server 8000

# Using Node http-server
npx http-server

# Using any static server
# Just ensure index.html is the default
```

Open `http://localhost:8000/` or your server URL in a browser.

## License

Proprietary - Bottle Amigo
