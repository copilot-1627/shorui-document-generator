# Shorui - AI Document Generator

Shorui is an AI-powered automatic document generator web application that allows users to create professional documents instantly using advanced AI technology.

## Features

- 🔐 **Google OAuth Authentication** - Secure login with Google accounts
- 🤖 **AI-Powered Generation** - Uses Perplexity API with Claude 4.5 model
- 📄 **Document Creation** - Generates professional Word documents (.docx)
- 📊 **Usage Tracking** - Monitor document generation limits
- 💬 **Chat Interface** - Interactive conversation-style document creation
- 📱 **Responsive Design** - Works on desktop and mobile devices
- ⚡ **Real-time Processing** - Instant document generation and download

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: EJS templating engine with Tailwind CSS
- **Authentication**: Passport.js with Google OAuth 2.0
- **AI Integration**: Perplexity API (Claude 4.5 model)
- **Document Generation**: Python with python-docx library
- **Database**: In-memory storage (can be easily replaced with MongoDB/PostgreSQL)

## Prerequisites

Before running this application, make sure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x with python-docx library
- Google OAuth 2.0 credentials
- Perplexity API key

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/shorui-document-generator.git
   cd shorui-document-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install python-docx
   ```

4. **Set up environment variables**
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

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## Configuration

### Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (for development)
   - `https://yourdomain.com/auth/google/callback` (for production)

### Perplexity API Setup

1. Sign up at [Perplexity AI](https://www.perplexity.ai/)
2. Get your API key from the dashboard
3. Add the API key to your `.env` file

## Usage

1. **Login**: Click "Login with Google" on the homepage
2. **Complete Profile**: Add your phone number to complete registration
3. **Dashboard**: View your usage statistics and document history
4. **Create Document**: Click "New Document" and describe what you need
5. **AI Generation**: The AI will generate Python code to create your document
6. **Download**: Download the generated document file

## API Endpoints

### Authentication Routes
- `GET /auth/google` - Initiate Google OAuth
- `GET /auth/google/callback` - Handle OAuth callback
- `GET /auth/logout` - User logout

### Application Routes
- `GET /` - Landing page
- `GET /dashboard` - User dashboard
- `GET /chat` - New document creation interface
- `POST /chat/generate` - Generate document with AI
- `GET /chat/download/:filename` - Download generated document

## Project Structure

```
shorui-document-generator/
├── config/                 # Configuration files
├── middleware/             # Custom middleware
├── models/                 # Data models (in-memory storage)
│   └── data.js
├── public/                 # Static assets
│   ├── css/
│   │   └── custom.css
│   └── js/
│       └── app.js
├── routes/                 # Route handlers
│   ├── auth.js
│   ├── dashboard.js
│   └── chat.js
├── views/                  # EJS templates
│   ├── partials/
│   ├── index.ejs
│   ├── dashboard.ejs
│   ├── chat.ejs
│   ├── complete-profile.ejs
│   ├── error.ejs
│   └── 404.ejs
├── .env.example           # Environment variables template
├── package.json           # Dependencies and scripts
├── server.js              # Main application file
└── README.md              # This file
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This will start the server with nodemon for auto-reloading.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|-----------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `PERPLEXITY_API_KEY` | Perplexity AI API Key | Yes |
| `SESSION_SECRET` | Session encryption secret | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |

## Database Migration

Currently, the application uses in-memory storage. To migrate to a persistent database:

1. **MongoDB**: Replace the data models in `models/data.js` with Mongoose schemas
2. **PostgreSQL**: Use Sequelize or another ORM to define models
3. **SQLite**: Use better-sqlite3 for a file-based database

## Security Features

- ✅ Helmet.js for security headers
- ✅ Rate limiting for API endpoints
- ✅ CSRF protection (simulated)
- ✅ Input validation and sanitization
- ✅ Secure session management
- ✅ Phone number uniqueness validation

## Deployment

### Heroku Deployment

1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy using Git or GitHub integration

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment-specific Configuration

- **Development**: Uses local storage and detailed error messages
- **Production**: Enable security features and error logging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Email: support@shorui.com (if applicable)

## Roadmap

- [ ] Add support for multiple document formats (PDF, HTML)
- [ ] Implement user subscription plans
- [ ] Add document templates
- [ ] Real-time collaboration features
- [ ] Mobile app development
- [ ] Integration with cloud storage providers

## Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Perplexity AI](https://www.perplexity.ai/) - AI API provider
- [Google OAuth](https://developers.google.com/identity/protocols/oauth2) - Authentication
- [python-docx](https://python-docx.readthedocs.io/) - Document generation