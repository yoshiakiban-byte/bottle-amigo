# Bottle Amigo Consumer Frontend

A mobile-first single-page application (SPA) for the Bottle Amigo system, built with vanilla JavaScript, HTML5, and CSS.

## Features

- **Authentication**: Login and registration with JWT token management
- **Bottle Management**: View personal bottles with remaining percentage indicators
- **Check-in System**: QR code scanning or manual store ID entry for check-ins
- **Amigo Network**: Request, accept, and manage amigos within stores
- **Bottle Sharing**: Share bottles with other amigos
- **Notifications**: Real-time notifications for amigo check-ins, store posts, and bottle gifts
- **Responsive Design**: Mobile-first UI with bottom navigation
- **Japanese UI**: Full Japanese language interface

## Technical Stack

- **HTML5**: Semantic markup with mobile viewport optimization
- **Vanilla JavaScript (ES Modules)**: No build tools or npm required
- **Tailwind CSS**: Via CDN for styling
- **html5-qrcode**: Via CDN for QR code scanning
- **Fetch API**: For all HTTP communication

## Project Structure

```
consumer/
├── index.html              # SPA entry point
├── css/
│   └── style.css          # Custom styles and Tailwind overrides
└── js/
    ├── app.js             # SPA router and app initialization
    ├── api.js             # API client wrapper
    ├── auth.js            # Login/register pages and logic
    ├── bottles.js         # Bottle list and detail pages
    ├── stores.js          # Store detail page
    ├── checkin.js         # QR scanning and check-in logic
    ├── amigos.js          # Amigo management
    ├── shares.js          # Bottle sharing functionality
    └── notifications.js   # Notification display and formatting
```

## Running the App

1. Ensure the BFF API is running on `http://localhost:3001`
2. Serve the consumer directory as static files:
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```
3. Open `http://localhost:8000` in your browser

## Pages/Routes

- `#/login` - User login page
- `#/register` - User registration page
- `#/home` - Bottle list (default page)
- `#/bottles/{id}` - Bottle detail view
- `#/stores/{id}` - Store detail with staff and posts
- `#/checkin` - Check-in with QR or manual input
- `#/amigos` - Amigo management and requests
- `#/shares/{bottleId}` - Share bottle with amigo
- `#/notifications` - Notification history

## Design

- **Color Scheme**: Warm amber/orange (#F59E0B) on dark backgrounds (#1F2937, #111827)
- **Bottom Navigation**: Fixed navigation bar with 4 main sections
- **Progress Indicators**: Color-coded bottle percentages (green >50%, yellow 25-50%, red <25%)
- **Responsive**: Mobile-first design optimized for smartphones

## Authentication Flow

1. User registers or logs in
2. JWT token is stored in localStorage (`bottle_amigo_token`)
3. User info is stored in localStorage (`bottle_amigo_user`)
4. Token is included in all authenticated requests via `Authorization: Bearer {token}` header
5. 401 responses redirect to login page

## Key Implementation Details

- **SPA Router**: Hash-based routing with `window.onhashchange`
- **Loading States**: Global loading spinner during API calls
- **Error Handling**: Toast notifications for API errors
- **QR Scanner**: Uses html5-qrcode library for camera access
- **State Management**: Simple JavaScript object in app instance
- **No Dependencies**: Zero npm packages, uses only CDN-hosted libraries

## Browser Compatibility

Requires modern browsers supporting:
- ES6 modules
- Fetch API
- localStorage
- Camera API (for QR scanning)
- CSS Grid/Flexbox
