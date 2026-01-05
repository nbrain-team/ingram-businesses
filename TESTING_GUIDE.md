# Testing Guide

Complete testing checklist to verify all features work correctly.

## 🧪 Pre-Deployment Testing (Local)

### Setup Test Environment

```bash
# 1. Install dependencies
npm install

# 2. Setup test database
# Create a test PostgreSQL database
createdb ingram_credentials_test

# 3. Configure .env for testing
cp env-template.txt .env
# Edit .env with test database credentials

# 4. Start server
npm start

# 5. Open browser
open http://localhost:3000
```

### Test Checklist - Local

#### ✅ Page Load
- [ ] Page loads without errors
- [ ] Header displays correctly
- [ ] Summary section visible
- [ ] All 5 credential cards display
- [ ] Cards are minimized by default
- [ ] Status badges show "NEEDED" in red

#### ✅ Card Interaction
- [ ] Click first card - expands smoothly
- [ ] Instructions display correctly
- [ ] Two buttons visible: "Upload" and "Book Call"
- [ ] Click again - collapses smoothly
- [ ] Expand multiple cards simultaneously
- [ ] Expand icon rotates correctly

#### ✅ Credential Upload - Text
- [ ] Click "Upload Credential"
- [ ] Modal opens with animation
- [ ] Enter text in textarea: `TEST_API_KEY=abc123xyz`
- [ ] Click "Upload Credential"
- [ ] Success message displays
- [ ] Modal closes
- [ ] Card status changes to "COMPLETED" (green)
- [ ] Success message shows in card
- [ ] Page doesn't reload (AJAX)

#### ✅ Credential Upload - File
- [ ] Click "Upload Credential" on different card
- [ ] Select a PDF file
- [ ] Upload succeeds
- [ ] Status changes to "COMPLETED"
- [ ] Try uploading .exe file - should fail
- [ ] Try uploading 20MB file - should fail
- [ ] Upload .txt file - should succeed
- [ ] Upload .jpg file - should succeed

#### ✅ Calendar Booking
- [ ] Click "Having Trouble? Book a Call"
- [ ] Calendar modal opens
- [ ] Date picker shows (minimum tomorrow)
- [ ] Try selecting today - should be disabled
- [ ] Select tomorrow's date
- [ ] If weekend - shows error message
- [ ] If weekday - time slots appear
- [ ] Time slots show 10:00 AM - 4:00 PM
- [ ] 30-minute increments (10:00, 10:30, 11:00, etc.)
- [ ] Click a time slot - highlights in blue
- [ ] "Book Appointment" button enables
- [ ] Click "Book Appointment"
- [ ] Success message with date/time
- [ ] Modal closes

#### ✅ Calendar Conflict Prevention
- [ ] Book a time slot (e.g., 2:00 PM tomorrow)
- [ ] Open calendar again
- [ ] Select same date
- [ ] That time slot should be missing from available slots
- [ ] Try booking via API directly - should fail with 409

#### ✅ Database Verification
```bash
# Connect to database
psql $DATABASE_URL

# Check credentials
SELECT id, name, status FROM credentials;
# Should show 5 credentials, some with 'completed' status

# Check uploaded data
SELECT name, credential_data, file_path FROM credentials WHERE status = 'completed';
# Should show your test uploads

# Check appointments
SELECT * FROM appointments;
# Should show your booked appointment(s)

# Exit
\q
```

#### ✅ API Endpoints
```bash
# Test health check
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}

# Get all credentials
curl http://localhost:3000/api/credentials
# Should return JSON array of 5 credentials

# Get single credential
curl http://localhost:3000/api/credentials/1
# Should return single credential object

# Get available slots
curl "http://localhost:3000/api/appointments/available?date=2026-01-07"
# Should return array of available times

# Get all appointments
curl http://localhost:3000/api/appointments
# Should return array of appointments
```

#### ✅ Error Handling
- [ ] Stop database - page should show error
- [ ] Start database - page should recover
- [ ] Upload with no text/file - should show alert
- [ ] Book without selecting time - should show alert
- [ ] Close modal with X button - works
- [ ] Close modal by clicking outside - works

#### ✅ Responsive Design
- [ ] Resize browser to mobile width (375px)
- [ ] Cards stack vertically
- [ ] Buttons stack vertically
- [ ] Modals fit on screen
- [ ] Text remains readable
- [ ] No horizontal scroll
- [ ] Test on actual mobile device

---

## 🚀 Post-Deployment Testing (Render)

### After Deploying to Render

#### ✅ Deployment Success
- [ ] Render build completes without errors
- [ ] Service status shows "Live"
- [ ] Database status shows "Available"
- [ ] Health check passes
- [ ] No errors in logs

#### ✅ Production URL Access
- [ ] Visit your Render URL
- [ ] Page loads (may take 30s first time)
- [ ] HTTPS lock icon shows in browser
- [ ] No mixed content warnings
- [ ] Check browser console - no errors

#### ✅ Repeat All Local Tests
Run through entire local testing checklist on production URL:
- [ ] Page load
- [ ] Card interaction
- [ ] Text upload
- [ ] File upload
- [ ] Calendar booking
- [ ] Database verification (via Render shell)

#### ✅ Production-Specific Tests

**Test from Different Devices:**
- [ ] Desktop Chrome
- [ ] Desktop Firefox
- [ ] Desktop Safari
- [ ] Mobile iOS Safari
- [ ] Mobile Android Chrome
- [ ] Tablet

**Test from Different Networks:**
- [ ] Home WiFi
- [ ] Mobile data
- [ ] Different geographic location (VPN)

**Performance Tests:**
- [ ] Page loads in < 3 seconds
- [ ] Upload completes in < 5 seconds
- [ ] Calendar loads slots in < 2 seconds
- [ ] No lag when expanding cards

#### ✅ Database Access (Render Shell)

```bash
# In Render Dashboard → Web Service → Shell

# Connect to database
psql $DATABASE_URL

# Verify tables exist
\dt

# Check credentials
SELECT * FROM credentials;

# Check appointments
SELECT * FROM appointments;

# Test query for .env file generation
SELECT name, credential_data 
FROM credentials 
WHERE status = 'completed' 
ORDER BY name;

# Exit
\q
```

#### ✅ File Upload Verification

```bash
# In Render Shell
ls -la uploads/
# Should show uploaded files with timestamps

# Check file permissions
ls -la uploads/
# Should be readable

# View file content (text files)
cat uploads/[filename]
```

#### ✅ Logs Monitoring

```bash
# In Render Dashboard → Logs tab

# Look for:
- "Database tables initialized successfully"
- "Credentials seeded successfully"
- "Server running on port 10000"
- No error messages
- API request logs (GET, POST)
```

---

## 🐛 Common Issues & Solutions

### Issue: Page shows "Loading credentials..." forever

**Cause**: Database connection failed

**Solution**:
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Check database is running
# In Render Dashboard → Database → should show "Available"

# Check logs for connection errors
# Render Dashboard → Web Service → Logs
```

### Issue: File upload fails with "Invalid file type"

**Cause**: File type not in allowed list

**Solution**:
- Only PDF, TXT, JPG, PNG allowed
- Check file extension matches content
- Try different file

### Issue: Calendar shows no time slots

**Cause**: Selected weekend or all slots booked

**Solution**:
- Select a weekday (Mon-Fri)
- Try different date
- Check database for booked slots

### Issue: "Port already in use" on local

**Cause**: Another process using port 3000

**Solution**:
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 [PID]

# Or change port in .env
PORT=3001
```

### Issue: Database tables not created

**Cause**: Database connection failed on startup

**Solution**:
```bash
# Check DATABASE_URL format
# Should be: postgresql://user:pass@host:port/db

# Manually create tables
psql $DATABASE_URL < schema.sql

# Or restart service
# Render Dashboard → Manual Deploy
```

---

## 📊 Test Data for Manual Testing

### Sample Credentials to Upload

**Render Account:**
```
RENDER_ACCOUNT=danny@nbrain.ai
RENDER_INVITE_SENT=true
RENDER_ACCESS_LEVEL=admin
```

**Pinecone:**
```
PINECONE_API_KEY=abc123-def456-ghi789
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX=ingram-documents
```

**Database:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

**AWS S3:**
```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=ingram-uploads
AWS_REGION=us-east-1
```

**Email:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@ingrambusinesses.com
SMTP_PASS=app-specific-password
```

### Sample Files to Upload

Create test files:

```bash
# Create test PDF
echo "Test credential data" | ps2pdf - test-credential.pdf

# Create test TXT
echo "API_KEY=test123" > credentials.txt

# Use any small image
# test-screenshot.png (< 10MB)
```

---

## ✅ Final Pre-Launch Checklist

Before sharing with clients:

### Technical
- [ ] All tests pass on production
- [ ] No errors in logs
- [ ] Database backups enabled
- [ ] Health check returns 200
- [ ] SSL certificate valid
- [ ] All 5 credentials display
- [ ] Upload works (text and file)
- [ ] Calendar works (booking and conflicts)

### Content
- [ ] Instructions are clear
- [ ] Contact email correct (danny@nbrain.ai)
- [ ] No placeholder text
- [ ] No "TODO" comments
- [ ] Professional appearance

### Security
- [ ] .env not committed to git
- [ ] Database password strong
- [ ] File uploads validated
- [ ] SQL injection protected
- [ ] HTTPS enabled

### Documentation
- [ ] README.md complete
- [ ] DEPLOYMENT.md accurate
- [ ] QUICKSTART.md tested
- [ ] Contact info correct

### Monitoring
- [ ] Render alerts configured
- [ ] Database backup schedule set
- [ ] Logs accessible
- [ ] Metrics dashboard reviewed

---

## 📈 Load Testing (Optional)

For high-traffic scenarios:

```bash
# Install Apache Bench
brew install apache-bench  # macOS
apt-get install apache2-utils  # Linux

# Test page load
ab -n 100 -c 10 https://your-app.onrender.com/

# Test API endpoint
ab -n 100 -c 10 https://your-app.onrender.com/api/credentials

# Expected results:
# - 100% success rate
# - Average response time < 500ms
# - No failed requests
```

---

## 🎯 User Acceptance Testing

Have a colleague or test user:

1. **First Impression** (5 min)
   - Can they understand what to do?
   - Is it visually appealing?
   - Any confusion?

2. **Complete One Credential** (10 min)
   - Read instructions
   - Upload credential
   - Verify completion

3. **Book Appointment** (5 min)
   - Find the button
   - Select date/time
   - Complete booking

4. **Feedback** (5 min)
   - What was confusing?
   - What could be clearer?
   - Any bugs or issues?

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

**Tester**: [Name]
**Environment**: [Local/Production]
**Browser**: [Chrome/Firefox/Safari]
**Device**: [Desktop/Mobile/Tablet]

### Results
- [ ] All tests passed
- [ ] Some tests failed (see below)
- [ ] Blocked by issues

### Failed Tests
1. [Test name] - [Description of failure]
2. [Test name] - [Description of failure]

### Notes
- [Any observations]
- [Performance issues]
- [UX feedback]

### Screenshots
[Attach if relevant]
```

---

## 🚦 Go/No-Go Decision

**Ready to launch if**:
✅ All critical tests pass
✅ No errors in production logs
✅ Database accessible
✅ File uploads work
✅ Calendar bookings work
✅ Responsive on mobile
✅ Performance acceptable

**Do NOT launch if**:
❌ Database connection fails
❌ File uploads broken
❌ Calendar doesn't load
❌ Errors in production logs
❌ Security vulnerabilities found

---

**Questions about testing?** Contact danny@nbrain.ai

**Found a bug?** Check logs first, then contact support

**Ready to launch?** ✅ You're good to go!

