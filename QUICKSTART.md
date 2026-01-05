# Quick Start Guide

Get the Ingram Credential Portal running in 5 minutes!

## 🚀 Local Development (Fast Track)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy the environment template
cp env-template.txt .env

# Edit .env with your database credentials
# Minimum required: DATABASE_URL
```

### 3. Start the Server
```bash
npm start
```

### 4. Open Browser
Navigate to: http://localhost:3000

That's it! 🎉

## 🌐 Deploy to Render (Production)

### Quick Deploy
1. Push code to GitHub
2. Go to https://render.com
3. Click "New +" → "Blueprint"
4. Connect your GitHub repo
5. Click "Apply"

Done! Your app will be live in ~5 minutes.

## 📋 What You Get

✅ **5 Pre-configured Credentials:**
- Render Account Setup
- Pinecone Account Setup
- Database Access Credentials
- AWS S3 Credentials
- Email Service Configuration

✅ **Features:**
- Expandable credential cards
- Text or file upload (PDF, TXT, images)
- Calendar booking system (Mon-Fri, 10am-4pm PST)
- Status tracking (Needed/Completed)
- PostgreSQL database storage

## 🔧 Troubleshooting

**"Cannot connect to database"**
- Check your DATABASE_URL in .env
- Make sure PostgreSQL is running
- Verify credentials are correct

**"Port already in use"**
- Change PORT in .env to a different number (e.g., 3001)

**"Module not found"**
- Run `npm install` again
- Delete node_modules and run `npm install`

## 📚 Need More Help?

- Full documentation: See README.md
- Deployment guide: See DEPLOYMENT.md
- Contact: danny@nbrain.ai

## 🎯 Next Steps

1. ✅ Get it running locally
2. ✅ Test credential upload
3. ✅ Test calendar booking
4. ✅ Deploy to Render
5. ✅ Share with clients
6. 🔄 Collect feedback

Happy coding! 🚀

