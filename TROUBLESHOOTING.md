# Troubleshooting Guide - Shorui

## CSS Not Loading Issues

If you're experiencing issues where the web pages show only raw HTML without CSS styling, follow these steps:

### Quick Fix - Use the Test Server

1. **Run the test server instead:**
   ```bash
   npm run test-css
   # or for development with auto-restart:
   npm run dev-css
   ```

2. **Test CSS loading:**
   - Visit `http://localhost:3000/test` to verify CSS is working
   - You should see a styled blue page with white text and rounded boxes

### Root Cause Solutions

#### Solution 1: Install Missing Dependencies
```bash
npm install express-ejs-layouts
```

#### Solution 2: Check Static File Serving

Ensure your `public` folder structure is correct:
```
public/
├── css/
│   └── custom.css
└── js/
    └── app.js
```

#### Solution 3: Verify File Permissions
On Unix systems, ensure files are readable:
```bash
chmod -R 755 public/
```

#### Solution 4: Clear Browser Cache
- Hard refresh: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache completely
- Try in incognito/private mode

#### Solution 5: Check Network Tab
1. Open browser developer tools (F12)
2. Go to Network tab
3. Refresh the page
4. Look for failed requests to CSS files (they'll be red)
5. Check if `/css/custom.css` loads successfully

### File-by-File Verification

#### 1. Check server.js Configuration
Ensure static files are served first:
```javascript
// This MUST be before other middleware
app.use(express.static(path.join(__dirname, 'public')));
```

#### 2. Verify layout.ejs Template
The layout should include:
```html
<link href="/css/custom.css" rel="stylesheet">
```

#### 3. Test Individual Files
Verify each file exists and is accessible:
- `http://localhost:3000/css/custom.css`
- `http://localhost:3000/js/app.js`

### Alternative Solutions

#### Use the Simplified Server
If layouts continue to cause issues, use `start.js`:
```bash
node start.js
```

This version:
- Disables express-ejs-layouts
- Uses inline HTML
- Has more explicit static file serving
- Includes a CSS test route

#### Debug Mode
1. Enable debug logging:
   ```bash
   DEBUG=express:* node server.js
   ```

2. Check if files are being requested:
   ```bash
   DEBUG=express:static node server.js
   ```

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Missing dependency | `express-ejs-layouts` error | Run `npm install express-ejs-layouts` |
| Wrong path | 404 on CSS files | Check public folder structure |
| CSP blocking | Console security errors | Disable helmet or update CSP |
| File permissions | CSS 403 errors | Run `chmod -R 755 public/` |
| Cache issues | Old styles showing | Hard refresh or clear cache |

### Testing Steps

1. **Basic Test:**
   ```bash
   curl http://localhost:3000/css/custom.css
   ```
   Should return CSS content, not 404.

2. **Layout Test:**
   View page source and verify CSS links are present in `<head>`

3. **Network Test:**
   Use browser dev tools to check if CSS files load (200 status)

### If Nothing Works

1. **Complete Reset:**
   ```bash
   rm -rf node_modules
   npm install
   npm run dev-css
   ```

2. **Use Alternative Server:**
   The `start.js` file bypasses layout issues with inline CSS

3. **Manual Verification:**
   Open `public/css/custom.css` in browser:
   `http://localhost:3000/css/custom.css`

### Report Issues

If problems persist:
1. Check browser console for errors
2. Verify file structure matches documentation
3. Test with `start.js` to isolate layout issues
4. Check if antivirus/firewall blocks local files

---

**Quick Success Test:** After any fix, visit `/test` route to see if styling works.