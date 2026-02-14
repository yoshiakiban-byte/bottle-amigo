# Bottle Amigo Consumer - Architecture Overview

## Application Architecture

```
┌─────────────────────────────────────────────────────┐
│               index.html (Entry Point)              │
│  - Loads Tailwind CSS CDN                           │
│  - Loads html5-qrcode CDN                           │
│  - Loads custom CSS                                 │
│  - Mounts app.js as ES module                       │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────v──────────────────┐
        │   app.js (SPA Router)          │
        │  - Hash-based navigation       │
        │  - Page rendering orchestration│
        │  - State management            │
        │  - Bottom nav management       │
        └─────────┬──────────────────────┘
                  │
        ┌─────────v─────────────────────────────────┐
        │         API Layer (api.js)                 │
        │  - Fetch wrapper                          │
        │  - Token management                       │
        │  - Authentication                         │
        │  - Error handling                         │
        │  - Loading states                         │
        └─────────┬──────────────────────────────────┘
                  │
      ┌───────────v────────────────────────────┐
      │      BFF API (http://localhost:3001)   │
      │  - Authentication endpoints            │
      │  - Consumer endpoints                  │
      │  - Data persistence                    │
      └────────────────────────────────────────┘
```

## Module Dependencies

```
app.js (Main Entry Point)
├── auth.js (Authentication)
├── bottles.js (Bottle Management)
├── stores.js (Store Details)
├── checkin.js (Check-in)
├── amigos.js (Amigo Network)
├── shares.js (Bottle Sharing)
├── notifications.js (Notifications)
└── api.js (API Client)
    └── HTTP Calls to BFF

css/style.css (Styling)
└── Tailwind CSS (from CDN)
```

## Page Navigation Flow

```
              ┌─────────────┐
              │ Login/Reg   │
              └──────┬──────┘
                     │
              ┌──────v──────┐
              │    Home     │ ◄────┐
              │ (Bottles)   │      │
              └──────┬──────┘      │
                     │            │
        ┌────────────┼────────────────────┐
        │            │                    │
    ┌───v──┐    ┌───v────┐    ┌──────┐  │
    │Detail│    │CheckIn │    │Amigos│  │
    │      │    │        │    │      │  │
    └───┬──┘    └───┬────┘    └───┬──┘  │
        │           │             │      │
    ┌───v──┐    ┌───v────┐    ┌──┐───┐ │
    │Share │    │Success │    │Notify├─┘
    └──────┘    └────────┘    └──────┘
```

## Data Flow

```
User Input
    │
    ├─ Event Handler (in template)
    │
    ├─ App Method (app.js)
    │
    ├─ Module Function (amigos.js, bottles.js, etc.)
    │
    ├─ API Call (api.js)
    │
    ├─ HTTP Request
    │
    ├─ BFF Response
    │
    ├─ Error/Success Handling
    │
    ├─ UI Render/Update
    │
    └─ Display to User
```

## State Management

### Global State (window.currentApp)
```javascript
{
    currentPage: string,           // Current page name
    currentRoute: string,          // Current route path
    
    // Checkin state
    selectedStoreId: string,
    selectedStoreName: string,
    amigos: Array,
    
    // Share state
    selectedShareAmigoId: string,
    selectedShareAmigoName: string,
}
```

### LocalStorage
```
bottle_amigo_token    // JWT token
bottle_amigo_user     // User object {id, name, email}
```

## Component Hierarchy

```
App
├── Header (dynamic per page)
│   ├── Title
│   └── Back Button (if needed)
├── Main Content (dynamic per page)
│   ├── Page-specific components
│   └── Cards, Forms, Lists
└── Bottom Navigation
    ├── Home Link
    ├── Checkin Link
    ├── Amigos Link
    └── Notifications Link (with badge)
```

## Authentication Flow

```
┌──────────────┐
│ User visits  │
└────────┬─────┘
         │
         ├─ Route to auth page?
         │  └─ Render login/register
         │
         ├─ Already logged in?
         │  ├─ Token in localStorage?
         │  └─ Render protected page
         │
         ├─ Request API with token
         │  └─ Authorization: Bearer {token}
         │
         ├─ API returns 401?
         │  ├─ Clear token
         │  └─ Redirect to login
         │
         └─ API returns 200?
            └─ Display data
```

## CSS Architecture

```
style.css
├── CSS Variables (colors, sizes)
├── Base Styles (body, links, etc.)
├── Page Layouts
│   ├── Main content area
│   └── Bottom navigation
├── Components
│   ├── Cards
│   ├── Buttons (primary, secondary, small)
│   ├── Input fields
│   ├── Progress bars
│   ├── Circular progress
│   ├── Tabs
│   └── Badges
├── Utilities
│   ├── Empty states
│   ├── Loading animations
│   └── Toast animations
└── Responsive Design
    └── Mobile-first media queries
```

## Module Responsibilities

### auth.js
- Render login/register pages
- Handle form submissions
- Manage token storage
- Auto-login after registration

### bottles.js
- Render bottle list with cards
- Display bottle details
- Show progress indicators
- Handle bottle sharing initiation

### stores.js
- Fetch and display store details
- Show staff shift information
- Display message of the day
- List recent posts with icons

### checkin.js
- Initialize QR code scanner
- Handle manual store ID input
- Amigo selection UI
- Check-in submission
- Success display

### amigos.js
- List amigos by store
- Accept/reject requests
- Search for users
- Submit amigo requests
- Store filtering

### shares.js
- Display eligible amigos for sharing
- Confirm share action
- Submit share to API
- Navigation after sharing

### notifications.js
- Format notifications by type
- Display unread indicators
- Calculate relative time
- Count unread notifications

### api.js
- All HTTP communication
- Token management
- Loading/error states
- 401 redirect logic
- Toast notifications

## Responsive Design Strategy

```
Mobile First (< 640px)
├── Full width content
├── Bottom navigation fixed
├── Large touch targets (buttons)
├── Stack layouts vertically
└── Simplified layouts

Desktop/Tablet Support
├── Max-width containers
├── Optimized spacing
├── Larger fonts
└── Multi-column layouts (CSS Grid)
```

## Performance Optimizations

1. **No build step**: Direct ES modules
2. **CDN-hosted libraries**: Cached globally
3. **Minimal DOM manipulation**: Template strings
4. **Lazy loading**: Only load what's needed
5. **Debounced search**: Prevent spam requests
6. **CSS animations**: Hardware accelerated
7. **No polling**: Event-driven updates

## Browser Requirements

- ES6 module support
- Fetch API
- localStorage API
- CSS Grid/Flexbox
- Camera API (for QR)
- Modern JavaScript (arrow functions, template literals, destructuring)

## Security Considerations

1. **Token Storage**: localStorage (adequate for SPA)
2. **HTTPS**: Should be used in production
3. **Token Expiry**: Handled by BFF
4. **CORS**: Configured in BFF
5. **XSS Prevention**: Template rendering safe
6. **CSRF**: Handled by BFF with proper headers
