# Gmail Email Monitoring Setup Guide

This guide will help you set up Gmail email monitoring for the Agentic AI Recruiter App.

## Why Gmail?

Gmail is easier to set up than Outlook because:
- ✅ Simpler OAuth flow
- ✅ Better documentation
- ✅ Google API libraries already included
- ✅ More straightforward API

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing one)
3. Enable the **Gmail API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

## Step 2: Create OAuth Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" (unless you have a Google Workspace)
   - Fill in required fields (App name, User support email, Developer contact)
   - Add scopes: `https://www.googleapis.com/auth/gmail.readonly`
   - Add test users (your Gmail address) if in testing mode
   - Save and continue through the steps
4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: "Agentic AI Recruiter"
   - Authorized redirect URIs: `http://localhost:8000/auth/gmail/callback`
   - Click "Create"
5. Copy the **Client ID** and **Client Secret**

## Step 3: Add Credentials to .env

Add these to your `backend/.env` file:

```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:8000/auth/gmail/callback
```

## Step 4: Authenticate Gmail

1. Start your backend server
2. Visit: `http://localhost:8000/api/gmail/auth/url`
3. Copy the `authorization_url` from the response
4. Open that URL in your browser
5. Sign in with your Gmail account
6. Grant permissions
7. You'll be redirected to a URL with `code=` and `state=` parameters
8. Call the callback endpoint:
   ```
   POST http://localhost:8000/api/gmail/auth/callback
   Body: {
     "code": "the_code_from_url",
     "state": "the_state_from_url"
   }
   ```

## Step 5: Test Email Monitoring

Once authenticated, you can:

- **Check authentication status:**
  ```
  GET http://localhost:8000/api/gmail/auth/status
  ```

- **Get recent emails:**
  ```
  GET http://localhost:8000/api/gmail/emails?max_results=10
  ```

- **Analyze an email:**
  ```
  POST http://localhost:8000/api/gmail/emails/{email_id}/analyze
  ```

- **Mark email as read:**
  ```
  POST http://localhost:8000/api/gmail/emails/{email_id}/mark-read
  ```

## API Endpoints

### Authentication
- `GET /api/gmail/auth/status` - Check if authenticated
- `GET /api/gmail/auth/url` - Get OAuth authorization URL
- `POST /api/gmail/auth/callback` - Complete OAuth flow

### Email Operations
- `GET /api/gmail/emails?max_results=10&query=is:unread` - Get emails
- `POST /api/gmail/emails/{email_id}/analyze` - Analyze email sentiment
- `POST /api/gmail/emails/{email_id}/mark-read` - Mark as read

## Query Examples

You can filter emails using Gmail search syntax:

- `is:unread` - Unread emails
- `from:candidate@example.com` - From specific sender
- `subject:interview` - Emails with "interview" in subject
- `newer_than:7d` - Emails from last 7 days
- `is:unread from:candidate@example.com` - Combine filters

## Troubleshooting

### "No valid credentials" error
- Make sure you've completed the OAuth flow
- Check that `data/gmail_token.json` exists
- Try re-authenticating

### "OAuth state not found" error
- Make sure you're using the state from the same session
- Start the auth flow again

### "Access denied" error
- Make sure you've added your email as a test user (if in testing mode)
- Check that Gmail API is enabled in Google Cloud Console
- Verify redirect URI matches exactly

### Token expired
- The service will automatically refresh tokens
- If refresh fails, re-authenticate

## Security Notes

- Never commit `gmail_token.json` or `.env` to git
- Store credentials securely in production
- Use environment variables for sensitive data
- Consider using a secrets manager for production

## Next Steps

Once Gmail monitoring is working, you can:
1. Set up automatic polling for new candidate emails
2. Integrate with candidate cards to auto-update status
3. Add email notifications for positive replies
4. Create a frontend UI for email monitoring




