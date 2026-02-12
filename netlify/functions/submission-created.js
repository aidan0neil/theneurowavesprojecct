const fs = require('fs');
const path = require('path');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY || process.env.NETLIFY_EMAILS_PROVIDER_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN || process.env.NETLIFY_EMAILS_MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || process.env.FROM_EMAIL;
  const regionRaw = (process.env.MAILGUN_HOST_REGION || process.env.NETLIFY_EMAILS_MAILGUN_HOST_REGION || '').toLowerCase();
  const url = regionRaw === 'eu' ? 'https://api.eu.mailgun.net' : undefined;
  return { apiKey, domain, fromEmail, url };
}

function parseSubmission(event) {
  try {
    const parsed = JSON.parse(event.body || '{}');
    const payload = parsed.payload || parsed;
    const data = payload.data || {};
    return {
      formName: payload.form_name || data['form-name'] || '',
      data,
    };
  } catch {
    return { formName: '', data: {} };
  }
}

function getReleaseFormPath() {
  return path.resolve(__dirname, '../../release-forms/release-form.pdf');
}

function getWaiverUrl() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL || '';
  const base = siteUrl.replace(/\/+$/, '');
  return base ? `${base}/release-form.pdf` : '';
}

exports.handler = async (event) => {
  const { formName, data } = parseSubmission(event);

  // Only process the participant signup form.
  if (formName !== 'signup') {
    return { statusCode: 204, body: '' };
  }

  const participantEmail = String(data.email || '').trim();
  if (!participantEmail) {
    console.warn('submission-created: missing participant email');
    return { statusCode: 204, body: '' };
  }

  const race = String(data.race || 'NeuroWaves event').trim();
  const firstName = String(data.firstName || 'Participant').trim();
  const { apiKey, domain, fromEmail, url } = getMailgunConfig();

  if (!apiKey || !domain || !fromEmail) {
    console.error('submission-created: Mailgun env vars missing (need API key, domain, and from email)');
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Mailgun not configured' }) };
  }

  const mailgun = new Mailgun(formData);
  const clientConfig = { username: 'api', key: apiKey };
  if (url) clientConfig.url = url;
  const mg = mailgun.client(clientConfig);

  const releaseFormPath = getReleaseFormPath();
  const hasAttachment = fs.existsSync(releaseFormPath);
  const waiverUrl = getWaiverUrl();

  const textLines = [
    `Hi ${firstName},`,
    '',
    `Thanks for signing up for the NeuroWaves ${race}.`,
    hasAttachment
      ? 'Your liability waiver is attached to this email.'
      : (waiverUrl ? `Please complete your liability waiver here: ${waiverUrl}` : 'We will send your liability waiver shortly.'),
    '',
    'Please complete it and bring it with you on race day.',
    '',
    'NeuroWaves Team',
  ];

  const messageData = {
    from: fromEmail,
    to: participantEmail,
    subject: `NeuroWaves ${race} Registration Confirmation + Liability Waiver`,
    text: textLines.join('\n'),
  };

  if (hasAttachment) {
    messageData.attachment = fs.createReadStream(releaseFormPath);
  }

  await mg.messages.create(domain, messageData);
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
