# 📧 Email Configuration Guide for SevaLink

## Current Status
- ✅ Email service code is implemented
- ✅ Nodemailer is installed and configured
- ✅ Gmail SMTP settings are correct
- ❌ Gmail authentication is failing

## 🔧 Gmail App Password Setup

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com/
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click "2-Step Verification"
4. Follow the setup process to enable 2FA

### Step 2: Generate App Password
1. Go to App Passwords: https://myaccount.google.com/apppasswords
2. Select "Mail" from the "Select app" dropdown
3. Select "Other (Custom name)" from the "Select device" dropdown
4. Enter "SevaLink Server" as the custom name
5. Click "Generate"
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Update .env File
1. Open `server/.env` file
2. Update the EMAIL_PASS with the app password (remove spaces):
   ```
   EMAIL_PASS=abcdefghijklmnop
   ```
3. Make sure EMAIL_USER is your full Gmail address:
   ```
   EMAIL_USER=your-email@gmail.com
   ```

### Step 4: Restart Server
1. Stop the current server (Ctrl+C)
2. Start the server again: `npm start`

## 🧪 Testing Email Configuration

### Method 1: API Endpoint
Visit: http://localhost:5000/api/auth/test-email

### Method 2: Forgot Password Flow
1. Go to: http://localhost:3001/forgot-password
2. Enter an existing email: `praveen_ramisetti354@gmail.com`
3. Check server console for OTP (if email fails)
4. Check your email inbox for the OTP email

### Method 3: Server Console
The OTP will always be logged to the server console for development testing.

## 🔍 Troubleshooting

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"
- **Cause**: App password is incorrect or not generated
- **Solution**: Generate a new app password and update .env

### Error: "self-signed certificate in certificate chain"
- **Cause**: SSL certificate issues
- **Solution**: Already handled in code with `rejectUnauthorized: false`

### Error: "ECONNREFUSED"
- **Cause**: Cannot connect to Gmail SMTP
- **Solution**: Check internet connection and firewall settings

## 📧 Email Templates

The system includes beautiful HTML email templates:

### OTP Email Features:
- ✅ Professional gradient design
- ✅ SevaLink branding
- ✅ Security tips
- ✅ 10-minute expiry warning
- ✅ Mobile-responsive

### Welcome Email Features:
- ✅ Feature overview
- ✅ Call-to-action buttons
- ✅ Community welcome message

## 🚀 Production Considerations

For production deployment:

1. **Use Environment Variables**: Never commit real credentials to git
2. **Email Service**: Consider using SendGrid, Mailgun, or AWS SES for better deliverability
3. **Rate Limiting**: Implement rate limiting for OTP requests
4. **Email Templates**: Store templates in separate files for easier maintenance

## 📝 Current Configuration

```javascript
// Current email settings in .env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ramanavarma9999@gmail.com
EMAIL_PASS=ouasadlvjsvhuoii  // This might need to be updated
```

## ✅ Verification Checklist

- [ ] 2-Factor Authentication enabled on Gmail
- [ ] App Password generated for "Mail" app
- [ ] EMAIL_PASS updated in .env file
- [ ] Server restarted after .env changes
- [ ] Test endpoint returns success
- [ ] OTP email received in inbox
- [ ] Forgot password flow works end-to-end

## 🆘 Still Not Working?

If emails are still not sending:

1. **Check Gmail Security**: https://myaccount.google.com/security
2. **Verify App Passwords**: https://myaccount.google.com/apppasswords
3. **Check Server Logs**: Look for detailed error messages
4. **Test with Different Email**: Try with a different Gmail account
5. **Use Alternative Service**: Consider using a different email service

## 📞 Support

The forgot password system will work even if email fails:
- OTP is always logged to server console
- Development mode shows OTP in API response
- Users can still reset passwords using console OTP

This ensures the functionality works while email issues are being resolved.
