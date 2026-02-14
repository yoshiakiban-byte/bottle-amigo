# Bottle Amigo Store Frontend - Deployment Guide

## Quick Start (60 seconds)

```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

Login with:
- **Store ID**: store_001
- **PIN**: 1234

That's it! No build process, no npm install, no configuration needed.

## What You're Deploying

A complete, production-ready staff management web app with:
- 2,066 lines of code (HTML, CSS, JavaScript)
- Zero npm dependencies
- Works in all modern browsers
- Fully responsive (iPad, mobile, desktop)
- Complete Japanese localization
- Professional error handling

## Files Included

```
store/
├── index.html              - Main application (322 lines)
├── css/style.css          - Styling (288 lines)
├── js/
│   ├── api.js             - API client (188 lines)
│   ├── app.js             - Router & controller (260 lines)
│   ├── auth.js            - Authentication (137 lines)
│   ├── checkins.js        - Check-in list (151 lines)
│   ├── customer.js        - Customer details (290 lines)
│   ├── bottles.js         - Bottle utilities (91 lines)
│   ├── posts.js           - Posts module (142 lines)
│   └── gifts.js           - Gift campaign (197 lines)
├── README.md              - Technical documentation
├── QUICKSTART.md          - User guide
└── IMPLEMENTATION_SUMMARY.txt - Complete summary
```

## Prerequisites

1. **BFF API Server** running at `http://localhost:3001`
2. **Web Browser** with ES6 support:
   - Safari (iOS 13+, macOS 10.12+)
   - Chrome (v90+)
   - Firefox (v88+)
   - Edge (v90+)

3. **Static File Server** (choose one):
   - Python 3: `python -m http.server`
   - Node.js: `npx http-server`
   - Apache/Nginx: Configure document root

## Deployment Steps

### Option 1: Local Testing (Python)

```bash
# Navigate to the app directory
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store

# Start Python HTTP server
python -m http.server 8000

# Open in browser
# http://localhost:8000
```

### Option 2: Node.js HTTP Server

```bash
cd /sessions/blissful-cool-ritchie/mnt/OBK/bottle-amigo/store
npx http-server -p 8000
```

### Option 3: Production Deployment (Apache/Nginx)

**Apache:**
```apache
<VirtualHost *:80>
    ServerName bottle-amigo-staff.example.com
    DocumentRoot /path/to/store
    
    <Directory /path/to/store>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
        
        # Enable gzip compression
        <IfModule mod_deflate.c>
            AddOutputFilterByType DEFLATE text/html text/plain text/xml
            AddOutputFilterByType DEFLATE text/css text/javascript
            AddOutputFilterByType DEFLATE application/javascript
        </IfModule>
    </Directory>
</VirtualHost>
```

**Nginx:**
```nginx
server {
    listen 80;
    server_name bottle-amigo-staff.example.com;
    root /path/to/store;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_types text/html text/plain text/css text/javascript application/javascript;
    gzip_min_length 1000;
    
    # Cache static assets
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA routing - serve index.html for all non-file routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Option 4: Docker

```dockerfile
FROM nginx:alpine
COPY store/ /usr/share/nginx/html/
EXPOSE 80
```

Build and run:
```bash
docker build -t bottle-amigo-store .
docker run -p 80:8080 bottle-amigo-store
```

## Configuration

### Change API Base URL

Edit `js/api.js` line 6:
```javascript
const API_BASE_URL = 'http://your-api-server:3001';
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
    --primary: #4F46E5;           /* Your primary color */
    --primary-dark: #3730A3;      /* Your dark color */
    --light: #F9FAFB;             /* Background light */
    --card: #F3F4F6;              /* Card background */
}
```

### Change Auto-Refresh Interval

Edit `js/checkins.js` line 72:
```javascript
this.refreshInterval = setInterval(() => {
    this.loadCheckins();
}, 30000); // Change 30000 to milliseconds you want
```

## Environment Variables

The app reads from:
- `localStorage` for stored tokens and staff info
- Browser's `fetch()` for API calls
- `window.location.hash` for routing

No environment variable file needed.

## API Integration

The app expects these endpoints at your BFF server:

```
POST   /auth/staff/login
GET    /store/checkins/active?storeId={id}
POST   /store/checkins/{id}/end
GET    /store/customers/{userId}/summary?storeId={id}
POST   /store/memos
POST   /store/bottles/{id}/updateRemainingPct
POST   /store/bottles/{id}/refillToFull
POST   /store/bottles/addNew
POST   /store/posts
POST   /store/gifts
```

Response format example for `/auth/staff/login`:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "staff": {
    "staffId": "staff_123",
    "storeId": "store_001",
    "name": "田中太郎",
    "role": "mama",
    "type": "staff"
  }
}
```

## Testing the Deployment

1. **Test Login:**
   - Open http://localhost:8000
   - Enter Store ID and PIN
   - Click ログイン

2. **Test Dashboard:**
   - You should see active check-ins
   - Click a customer name to view details
   - Try updating bottle remaining %

3. **Test All Features:**
   - Create a post
   - Add a memo
   - If mama: test bottle refill and gift campaign

4. **Test Responsive Design:**
   - Open DevTools (F12)
   - Toggle device toolbar
   - Test iPad, iPhone, and desktop views

## Performance Optimization

### Enable Compression

Add gzip compression on your server to reduce file size:

```
Original size: ~78 KB
Compressed size: ~20 KB (75% reduction)
```

### Enable Caching

```
Static files (CSS, JS): Cache for 1 year
HTML: Cache for 5 minutes (or no-cache)
```

### Monitor Performance

Open DevTools Network tab to verify:
- `index.html` loads first
- CSS and JS load in parallel
- API calls complete within 500ms
- Total load time < 2 seconds

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] BFF API CORS configured for your domain
- [ ] JWT tokens validated on server
- [ ] Staff roles enforced on server
- [ ] API rate limiting enabled
- [ ] Sensitive data not logged
- [ ] Security headers configured

Example security headers to add:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.tailwindcss.com
```

## Troubleshooting

### "Cannot reach API server"
- Verify BFF server is running
- Check API base URL in js/api.js
- Enable CORS on BFF server
- Check Network tab for failed requests

### "Login page shows but nothing happens"
- Check browser console (F12) for errors
- Verify localStorage is enabled
- Try clearing browser cache

### "Buttons don't work on mobile"
- Ensure viewport meta tag is in index.html
- Check touch event listeners are attached
- Test with actual mobile device (not just DevTools)

### "Styles not loading"
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Verify Tailwind CDN is accessible
- Check css/style.css is in correct location

## Monitoring

Set up monitoring for:

1. **API Health:**
   - Monitor `/auth/staff/login` endpoint
   - Track 401 responses
   - Alert on 500 errors

2. **User Sessions:**
   - Track active staff members
   - Monitor session duration
   - Alert on unusual activity

3. **Performance:**
   - Page load times
   - API response times
   - Error rates

## Backup & Recovery

The app stores nothing locally except:
- JWT token in `localStorage`
- Staff info in `localStorage`

Both are cleared on logout. No data recovery needed.

Backup strategy:
1. Version control the source code
2. BFF database contains all persistent data
3. No backup of client-side files needed

## Updates

To update the app:

1. Update files in the `/store/` directory
2. Users automatically load the latest version (no caching issues with index.html)
3. Clear browser cache if needed
4. No server restart required

## Support

### Common Issues Quick Reference

| Issue | Solution |
|-------|----------|
| Blank page | Check console errors (F12) |
| API 401 error | Token expired, logout and login again |
| API CORS error | Enable CORS on BFF server |
| Styles broken | Clear cache, hard refresh |
| Mobile unresponsive | Check viewport meta tag |
| Auto-refresh not working | Check Network tab for API calls |

### Debug Mode

Enable debug logging in `js/api.js`:
```javascript
// Uncomment for debug logging
// console.log('API Request:', method, endpoint, data);
// console.log('API Response:', response);
```

## Migration from Development

1. Test all features in development
2. Configure API URL for production
3. Update default store ID if needed
4. Deploy to production server
5. Verify all endpoints work
6. Train staff on usage
7. Monitor for errors

## Rollback

If issues occur:
1. Revert to previous version of files
2. Clear browser cache
3. Log out and log back in
4. Verify API endpoint is still working

## Next Steps

1. Configure your API endpoint
2. Deploy to your server
3. Test with real staff credentials
4. Train staff
5. Monitor usage and errors
6. Gather feedback for improvements

## Support & Documentation

- **README.md** - Technical documentation
- **QUICKSTART.md** - User quick start guide
- **IMPLEMENTATION_SUMMARY.txt** - Complete feature list

---

**Deployment Date:** 2026-02-13  
**Status:** Ready for production  
**Support:** Check README.md for detailed documentation
