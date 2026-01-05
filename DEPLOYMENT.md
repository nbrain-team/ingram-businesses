# Deployment Guide - Render

This guide walks through deploying the Ingram Credential Portal to Render.

## Prerequisites

1. GitHub account with this repository
2. Render account (https://render.com)
3. Access to danny@nbrain.ai email for admin access

## Step-by-Step Deployment

### 1. Prepare Repository

Ensure these files are in your repository:
- ✅ `package.json`
- ✅ `server.js`
- ✅ `render.yaml`
- ✅ `public/index.html`
- ✅ `public/styles.css`
- ✅ `public/app.js`
- ✅ `.gitignore`

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - Ingram Credential Portal"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 3. Deploy to Render

#### Option A: Automatic Deployment (Recommended)

1. Log in to Render Dashboard
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and show:
   - Web Service: `ingram-credential-portal`
   - Database: `ingram-credentials-db`
5. Click "Apply"
6. Wait for deployment to complete (~5 minutes)

#### Option B: Manual Deployment

**Create Database:**
1. Click "New +" → "PostgreSQL"
2. Name: `ingram-credentials-db`
3. Database: `ingram_credentials`
4. User: `ingram_admin`
5. Plan: Starter (or Free for testing)
6. Click "Create Database"
7. Copy the "Internal Database URL"

**Create Web Service:**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `ingram-credential-portal`
   - **Environment**: Node
   - **Region**: Choose closest to users
   - **Branch**: main
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (or Free for testing)

4. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = [paste Internal Database URL]
   - `PORT` = `10000`
   - `UPLOAD_DIR` = `./uploads`
   - `MAX_FILE_SIZE` = `10485760`

5. Click "Create Web Service"

### 4. Verify Deployment

1. Wait for build to complete
2. Click on your service URL (e.g., `https://ingram-credential-portal.onrender.com`)
3. Verify the page loads with credential cards
4. Test expanding a card
5. Check health endpoint: `https://your-url.onrender.com/health`

### 5. Database Verification

Access Render Shell to verify database:

1. Go to your Database in Render Dashboard
2. Click "Connect" → "External Connection"
3. Use provided connection string with a PostgreSQL client

Or use Render Shell:
```bash
# In Render Dashboard → Web Service → Shell tab
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query('SELECT * FROM credentials').then(res => console.log(res.rows)).catch(e => console.error(e));
"
```

### 6. Test All Features

**Test Credential Upload:**
1. Expand a credential card
2. Click "Upload Credential"
3. Enter text or upload a file
4. Verify status changes to "COMPLETED"

**Test Calendar Booking:**
1. Click "Having Trouble? Book a Call"
2. Select a date (tomorrow or later, weekday only)
3. Choose a time slot
4. Click "Book Appointment"
5. Verify success message

### 7. Access Uploaded Credentials

**Via Render Shell:**
```bash
# Connect to your web service shell
psql $DATABASE_URL

# Query credentials
SELECT id, name, status, credential_data, file_path FROM credentials;

# Query appointments
SELECT * FROM appointments ORDER BY appointment_date DESC;
```

**For .env file usage:**
```bash
# Export credentials to text
SELECT name, credential_data FROM credentials WHERE status = 'completed';
```

## Environment Variables Reference

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `DATABASE_URL` | Auto-populated | PostgreSQL connection string |
| `PORT` | `10000` | Server port (Render default) |
| `UPLOAD_DIR` | `./uploads` | Directory for file uploads |
| `MAX_FILE_SIZE` | `10485760` | Max upload size (10MB) |

## Troubleshooting

### Build Fails
- Check Node.js version (must be 18+)
- Verify `package.json` is valid JSON
- Check build logs in Render Dashboard

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly
- Check database is running
- Ensure SSL is configured for production

### Files Not Uploading
- Check `UPLOAD_DIR` permissions
- Verify `MAX_FILE_SIZE` is sufficient
- Check file type is allowed (PDF, TXT, images)

### Calendar Not Showing Times
- Verify date is a weekday
- Check date is tomorrow or later
- Ensure database connection is working

## Monitoring

**Health Check:**
- URL: `https://your-url.onrender.com/health`
- Should return: `{"status":"ok","timestamp":"..."}`

**Logs:**
- Access via Render Dashboard → Your Service → Logs tab
- Monitor for errors and API calls

**Database Usage:**
- Check Render Dashboard → Database → Metrics
- Monitor connections and storage

## Updating the Application

**Automatic Deployment:**
```bash
git add .
git commit -m "Update description"
git push origin main
```

Render will automatically detect changes and redeploy.

**Manual Deployment:**
- Go to Render Dashboard → Your Service
- Click "Manual Deploy" → "Deploy latest commit"

## Scaling Considerations

**Free/Starter Plan Limitations:**
- Web service may spin down after inactivity
- Limited database storage
- No custom domains on free plan

**Upgrade Path:**
- Standard plan: Always-on service, more resources
- Pro plan: Autoscaling, priority support
- Database: Increase storage as needed

## Security Best Practices

1. **Never commit `.env` files** (already in `.gitignore`)
2. **Rotate database credentials** periodically
3. **Monitor upload directory** size
4. **Review uploaded files** regularly
5. **Enable Render's DDoS protection**
6. **Set up alerts** for service downtime

## Backup Strategy

**Database Backups:**
- Render automatically backs up databases daily
- Manual backup: Use `pg_dump` via Render Shell
- Store backups in separate location (S3, etc.)

**File Uploads:**
- Consider moving to S3 for production
- Implement periodic backup of `uploads/` directory

## Support

- **Render Documentation**: https://render.com/docs
- **Render Support**: support@render.com
- **Application Support**: danny@nbrain.ai

## Next Steps

1. ✅ Deploy to Render
2. ✅ Verify all features work
3. ✅ Test credential uploads
4. ✅ Test calendar bookings
5. ✅ Share URL with clients
6. ✅ Monitor usage and logs
7. 🔄 Collect feedback and iterate

