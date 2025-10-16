# 🚀 Shorui Beta v0.1 - Complete Setup Guide

**Made with ❤️ by Flaxa Technologies**

This guide will help you set up the fully functional Shorui AI Document Generator with:
- ✅ **Fixed CSS Loading**
- ✅ **Working Phone Number Validation** (+918310496175 format)
- ✅ **Persistent JSON Storage**
- ✅ **Actual AI Integration** (Perplexity API)
- ✅ **Real Python Code Execution**
- ✅ **Google Profile Pictures**
- ✅ **Responsive Design**
- ✅ **File Downloads**

## 📝 **Prerequisites**

### 1. **System Requirements**
```bash
# Check Node.js (v14+)
node --version

# Check npm
npm --version

# Check Python (3.x)
python --version
# or
python3 --version
```

### 2. **Install Python Dependencies**
```bash
# Install python-docx library
pip install python-docx
# or if using python3
pip3 install python-docx
```

## 🔧 **Installation Steps**

### 1. **Clone Repository**
```bash
git clone https://github.com/copilot-1627/shorui-document-generator.git
cd shorui-document-generator
```

### 2. **Install Node Dependencies**
```bash
npm install
```

### 3. **Configure Environment**
```bash
cp .env.example .env
```

### 4. **Edit .env File**
Open `.env` and configure:

```env
# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_SECRET=your-actual-client-secret

# Perplexity API (OPTIONAL - works with mock responses)
PERPLEXITY_API_KEY=pplx-your-api-key

# Session Secret (REQUIRED)
SESSION_SECRET=your-unique-secret-key-here

# Server Settings
PORT=3000
NODE_ENV=development
```

## 🔑 **Google OAuth Setup**

### 1. **Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable "Google+ API" or "Google People API"

### 2. **Create OAuth Credentials**
1. Go to "Credentials" in left sidebar
2. Click "+ CREATE CREDENTIALS" → "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`

### 3. **Get Credentials**
- Copy **Client ID** to `GOOGLE_CLIENT_ID`
- Copy **Client Secret** to `GOOGLE_CLIENT_SECRET`

## 🤖 **Perplexity AI Setup (Optional)**

### 1. **Get API Key**
1. Visit [Perplexity AI](https://www.perplexity.ai/)
2. Sign up and go to Settings → API
3. Generate API key

### 2. **Configure**
- Add to `.env`: `PERPLEXITY_API_KEY=pplx-your-key`
- **Note**: App works with mock responses if not provided

## 🚀 **Running the Application**

### **🎆 Main Application (RECOMMENDED)**
```bash
# Start the complete fixed version
npm start

# Development mode with auto-restart
npm run dev

# Alternative beta command
npm run beta
```

### **🛠 Alternative Servers (If Issues)**
```bash
# CSS test server
npm run test-css

# Original server backup
npm run old-server

# Backup app
npm run backup-app
```

## 🌐 **Access Application**

Open browser: **http://localhost:3000**

## 📊 **Test the Complete Flow**

### 1. **Homepage**
- Should show styled Shorui homepage
- "Beta v0.1" and "Made with ❤️ by Flaxa Technologies" in footer

### 2. **Login**
- Click "Login with Google"
- Complete Google OAuth flow

### 3. **Complete Profile**
- Enter phone: **+918310496175**
- Should accept without format error
- Click "Complete Setup" - should work!

### 4. **Dashboard**
- Shows your Google profile picture
- Displays usage statistics
- Responsive design
- "Beta v0.1" branding

### 5. **Create Document**
- Click "New Document"
- Enter topic: "Business proposal for tech startup"
- AI generates Python code
- Code executes automatically
- Real .docx file generated
- Download button works

## 📁 **File Structure**

```
shorui-document-generator/
├── app-final.js           # MAIN APPLICATION ⭐
├── models/
│   └── storage.js         # JSON file storage
├── utils/
│   └── python-executor.js # Python code execution
├── routes/
│   ├── auth-fixed.js      # Fixed authentication
│   ├── dashboard-fixed.js # Fixed dashboard  
│   └── chat-fixed.js      # Fixed chat system
├── views/
│   └── complete-profile-fixed.ejs # Fixed profile page
├── data/                  # Auto-created storage
├── generated-documents/   # Auto-created for .docx files
└── public/               # CSS and JS assets
```

## 🔍 **Debug & Troubleshooting**

### **Test Routes:**
- `http://localhost:3000/test` - Storage and CSS test
- `http://localhost:3000/` - Shows debug info

### **Common Issues:**

1. **CSS Not Loading**
   ```bash
   npm run test-css  # Use alternative server
   ```

2. **Python Not Found**
   ```bash
   python --version    # Should show Python 3.x
   pip install python-docx
   ```

3. **Phone Number Issues**
   - Use format: +918310496175
   - Include country code
   - No spaces or dashes

4. **Profile Completion Stuck**
   - Check console logs
   - Verify data/ directory created
   - Try refreshing page

### **Console Logging**
The app includes extensive logging:
- Authentication flow
- Storage operations
- Python code execution
- AI API calls

## 🎆 **Features Implemented**

### ✅ **Authentication & Profile**
- Google OAuth with profile pictures
- International phone number validation
- Persistent user storage
- Session management

### ✅ **Document Generation**
- Real Perplexity API integration (optional)
- Python code extraction and execution
- Automatic .docx file generation
- File serving and download

### ✅ **User Interface**
- Fully responsive design
- Profile pictures from Google
- "Beta v0.1" version display
- "Made with ❤️ by Flaxa Technologies" branding
- Mobile-friendly interface

### ✅ **Storage & Sessions**
- JSON file-based database
- File-based session storage
- Usage tracking and limits
- Document history

## 🛡 **Security Features**

- Helmet.js security headers
- Rate limiting
- Session security
- Input validation
- File system protection
- Error handling

## 🌍 **Production Deployment**

### **Heroku**
```bash
# Install Heroku CLI
heroku create your-shorui-app
heroku config:set GOOGLE_CLIENT_ID=your-id
heroku config:set GOOGLE_CLIENT_SECRET=your-secret
heroku config:set PERPLEXITY_API_KEY=your-key
heroku config:set SESSION_SECRET=your-secret
git push heroku main
```

### **Environment Updates for Production**
```env
NODE_ENV=production
APP_URL=https://your-domain.com
# Update Google OAuth redirect URI to production URL
```

## 🎉 **Success Checklist**

- [ ] Node.js and npm installed
- [ ] Python and python-docx installed
- [ ] Repository cloned
- [ ] Dependencies installed (`npm install`)
- [ ] Environment configured (`.env` file)
- [ ] Google OAuth credentials set up
- [ ] Server starts without errors (`npm start`)
- [ ] Homepage loads with proper CSS
- [ ] Google login works
- [ ] Phone number +918310496175 accepted
- [ ] Profile completion works
- [ ] Dashboard shows profile picture
- [ ] Document generation works
- [ ] Files download successfully
- [ ] "Beta v0.1" and "Flaxa Technologies" visible

## 🆆 **Need Help?**

1. **Check console logs** - App includes detailed logging
2. **Try test route** - Visit `/test` for diagnostics
3. **Use alternative server** - `npm run test-css` if issues
4. **Check troubleshooting guide** - See `TROUBLESHOOTING.md`

---

**🎆 You now have a complete, working AI document generator!**

**Made with ❤️ by Flaxa Technologies - Beta v0.1**