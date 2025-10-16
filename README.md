# Shorui - AI Document Generator

Shorui is an AI-powered automatic document generator web application that allows users to create professional documents instantly using advanced AI technology with **persistent storage** and **working session management**.

## 🆕 **Latest Updates**

- ✅ **Fixed CSS Loading Issues** - Complete styling now works properly
- ✅ **Added Persistent Storage** - User data and sessions now persist across server restarts
- ✅ **Fixed Phone Number Validation** - Now accepts international formats like +91, +92, +1, etc.
- ✅ **Working Session Management** - Profile completion now works correctly
- ✅ **File-based Database** - Uses JSON files for reliable data storage

## Features

- 🔐 **Google OAuth Authentication** - Secure login with Google accounts
- 📱 **Phone Number Verification** - International format support (+91, +92, +1, etc.)
- 🗄️ **Persistent Storage** - JSON file-based database that survives restarts
- 🤖 **AI-Powered Generation** - Uses Perplexity API with Claude 4.5 model (configurable)
- 📄 **Document Creation** - Generates professional Word documents (.docx)
- 📊 **Usage Tracking** - Monitor document generation limits with persistent counters
- 💬 **Chat Interface** - Interactive conversation-style document creation
- 📱 **Responsive Design** - Works on desktop and mobile devices
- ⚡ **Real-time Processing** - Instant document generation and download

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Tailwind CSS + Custom JavaScript (inline HTML)
- **Authentication**: Passport.js with Google OAuth 2.0
- **Sessions**: File-based session storage
- **Storage**: JSON file-based persistent storage
- **AI Integration**: Perplexity API integration ready
- **Document Generation**: Python script execution capability

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x with python-docx library
- Google OAuth 2.0 credentials
- Perplexity API key (optional - app works with mock responses)

## 🚀 **Quick Start (Fixed Version)**

### 1. **Clone and Install**
```bash
git clone https://github.com/copilot-1627/shorui-document-generator.git
cd shorui-document-generator
npm install
```

### 2. **Install Python Dependencies**
```bash
pip install python-docx
```

### 3. **Set up Environment Variables**
```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
PERPLEXITY_API_KEY=your-perplexity-api-key
SESSION_SECRET=your-super-secret-session-key
PORT=3000
NODE_ENV=development
```

### 4. **Start the Application**
```bash
# Main fixed application (RECOMMENDED)
npm start

# Development mode with auto-restart
npm run dev

# Alternative CSS test server (if issues persist)
npm run test-css
```

### 5. **Access the Application**
Open your browser and navigate to `http://localhost:3000`

## 🔧 **Fixed Issues**

### ✅ **Phone Number Validation**
Now accepts international formats:
- ✅ +918310496175 (India)
- ✅ +923001234567 (Pakistan) 
- ✅ +1234567890 (USA)
- ✅ +447123456789 (UK)

### ✅ **Session & Profile Management**
- Complete profile form now works correctly
- User data persists across server restarts
- Session management with file-based storage
- Proper authentication flow

### ✅ **CSS Loading Fixed**
- All Tailwind CSS styles now load properly
- Font Awesome icons working
- Custom CSS integrated
- Responsive design functional

### ✅ **Persistent Storage**
The app now uses JSON files for storage:
```
data/
├── users.json          # User profiles and auth data
├── chatSessions.json   # Document generation history
├── usageLimits.json    # Monthly usage tracking
└── sessions/           # Session files
```

## 📁 **Project Structure**

```
shorui-document-generator/
├── models/
│   └── storage.js      # Persistent JSON storage system
├── routes/
│   ├── auth-fixed.js   # Fixed authentication routes
│   ├── dashboard-fixed.js # Fixed dashboard with storage
│   └── chat-fixed.js   # Fixed chat and document generation
├── views/              # EJS templates
├── public/             # Static assets (CSS, JS)
├── data/               # JSON storage files (auto-created)
├── app.js              # Main application (NEW - FIXED VERSION)
├── server.js           # Original server (backup)
├── start.js            # CSS test server (alternative)
└── package.json        # Dependencies and scripts
```

## 🛠 **Available Scripts**

```bash
# Main application (RECOMMENDED)
npm start              # Fixed app with persistent storage
npm run dev            # Development mode with auto-restart

# Alternative servers
npm run test-css       # CSS test server (if styling issues)
npm run old-server     # Original server (backup)
```

## 📊 **Debug & Testing**

### **Test Routes:**
- `http://localhost:3000/test` - Storage and CSS test
- `http://localhost:3000/` - Main application with debug info

### **Debug Features:**
- Console logging for authentication flow
- Debug info on homepage showing session status
- Storage verification in test route
- Real-time user count display

## Configuration

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)

### Perplexity API Setup (Optional)

1. Sign up at [Perplexity AI](https://www.perplexity.ai/)
2. Get your API key from the dashboard
3. Add the API key to your `.env` file

**Note**: The app works with mock AI responses even without Perplexity API key.

## Usage Flow

1. **Login**: Click "Login with Google" on the homepage
2. **Complete Profile**: Add your phone number (supports international formats)
3. **Dashboard**: View your usage statistics and document history
4. **Create Document**: Click "New Document" and describe what you need
5. **AI Generation**: The AI will generate Python code to create your document
6. **Download**: Download the generated document file

## 🔐 **Security Features**

- ✅ Helmet.js for security headers
- ✅ Rate limiting for API endpoints
- ✅ Secure session management with file storage
- ✅ Input validation and sanitization
- ✅ Phone number uniqueness validation
- ✅ Persistent authentication state

## 💾 **Data Storage**

The application uses JSON files for persistent storage:

- **Users**: Profile data, authentication info, phone numbers
- **Sessions**: Document generation history and metadata  
- **Usage**: Monthly limits and usage tracking
- **Auth Sessions**: Login sessions with file-based storage

## 🚨 **Troubleshooting**

If you encounter any issues, check the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file for detailed solutions.

### Common Issues:

1. **CSS not loading**: Use `npm run test-css` instead
2. **Profile completion not working**: Check console logs, ensure proper authentication
3. **Phone validation failing**: Use format like +918310496175
4. **Data not persisting**: Check if `data/` directory is created

## 🚀 **Deployment**

### Heroku Deployment

1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy using Git or GitHub integration
4. Ensure `data/` directory permissions are set correctly

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Roadmap

- [ ] Add support for multiple document formats (PDF, HTML)
- [ ] Implement user subscription plans
- [ ] Add document templates
- [ ] Real-time collaboration features
- [ ] Mobile app development
- [ ] Integration with cloud storage providers
- [ ] MongoDB/PostgreSQL migration option

## Support

For support and questions:
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) first
- Create an issue on GitHub
- Review console logs for debugging

---

**🎉 The application now has fully working authentication, profile completion, persistent storage, and document generation!**