# Netlify Deployment Guide

## Overview
The NeuroWaves Marathon site has been configured for Netlify deployment with serverless functions.

## Files Added
- `netlify.toml` - Netlify configuration
- `netlify/functions/signup.js` - Serverless function for form submissions
- Updated `package.json` with Netlify CLI

## Deployment Options

### Option 1: Git-based Deployment (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Configure for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Select `aidan0neil/theneurowavesprojecct`
   - Build settings: Leave defaults (no build command needed)
   - Click "Deploy site"

3. **Configure Domain**
   - Go to Site settings → Domain management
   - Add custom domain: `www.theneurowavesproject.com`
   - Update DNS records as instructed by Netlify

### Option 2: Manual Deployment

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   # or use local version
   npm run netlify:dev
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Deploy**
   ```bash
   netlify deploy --prod --dir=public
   ```

## Environment Variables

For email functionality, set these in Netlify dashboard:

**Site settings → Build & deploy → Environment → Environment variables**

```
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@theneurowavesproject.com

# OR for Mailgun
MAILGUN_API_KEY=your-api-key
MAILGUN_DOMAIN=your-domain.com
MAILGUN_FROM_EMAIL=noreply@your-domain.com
```

## Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run Netlify dev server**
   ```bash
   npm run netlify:dev
   ```

3. **Test locally**
   - Visit `http://localhost:8888`
   - Test form submissions
   - Check Netlify function logs

## Important Notes

### Form Submissions
- Form data is stored in a temporary CSV file in the serverless function
- For production, consider using Netlify Forms or a database service
- Email functionality requires environment variables

### Custom Domain
- The CNAME file is configured for `www.theneurowavesproject.com`
- Netlify will automatically handle SSL certificates
- Update DNS to point to Netlify's provided records

### Performance
- Static files are served from Netlify's CDN
- Serverless functions have cold start delays (~100-500ms)
- Consider Netlify's Edge Functions for better performance

## Troubleshooting

### Form Not Submitting
- Check browser console for errors
- Verify Netlify function logs in dashboard
- Ensure `/api/signup` redirects are working

### Email Not Working
- Verify environment variables are set
- Check Netlify function logs for email errors
- Test SMTP/Mailgun credentials

### Domain Issues
- Verify DNS propagation (can take 24-48 hours)
- Check Netlify dashboard for domain status
- Ensure CNAME file matches custom domain

## Post-Deployment Checklist

- [ ] Site loads at custom domain
- [ ] All pages render correctly
- [ ] Form submissions work
- [ ] Email functionality configured
- [ ] SSL certificate active
- [ ] Test on mobile devices
- [ ] Check all navigation links
