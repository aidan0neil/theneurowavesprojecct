const fs = require('fs');
const path = require('path');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY || process.env.NETLIFY_EMAILS_PROVIDER_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN || process.env.NETLIFY_EMAILS_MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || process.env.FROM_EMAIL;
  const regionRaw = (process.env.MAILGUN_HOST_REGION || process.env.NETLIFY_EMAILS_MAILGUN_HOST_REGION || '').toLowerCase();
  const explicitUrl = process.env.MAILGUN_API_BASE_URL || process.env.NETLIFY_EMAILS_PROVIDER_URL;
  const url = explicitUrl || (regionRaw === 'eu' ? 'https://api.eu.mailgun.net' : undefined);
  return { apiKey, domain, fromEmail, url };
}

function parseSubmission(event) {
  try {
    const parsed = JSON.parse(event?.body || '{}');
    const payload = parsed.payload || parsed;
    const data = payload.data || {};
    return {
      formName: payload.form_name || data['form-name'] || '',
      data,
      payload,
    };
  } catch {
    return { formName: '', data: {}, payload: {} };
  }
}

function getReleaseFormPath() {
  const candidates = [
    path.resolve(__dirname, '../../release-forms/release-form.pdf'),
    path.resolve(__dirname, '../../public/release-form.pdf'),
    path.resolve(process.cwd(), 'release-forms/release-form.pdf'),
    path.resolve(process.cwd(), 'public/release-form.pdf'),
    '/var/task/release-forms/release-form.pdf',
    '/var/task/public/release-form.pdf',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function getWaiverUrl() {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.SITE_URL || '';
  const base = siteUrl.replace(/\/+$/, '');
  return base ? `${base}/release-form.pdf` : '';
}

exports.handler = async (event) => {
  const { formName, data, payload } = parseSubmission(event);
  const resolvedFormName = String(formName || payload.form_name || payload.name || '').trim();

  // Only process the participant signup form.
  if (resolvedFormName !== 'signup') {
    console.log('submission-created: skipped non-signup form', { formName: resolvedFormName || '(unknown)' });
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
    console.error('submission-created: Mailgun env vars missing', {
      hasApiKey: Boolean(apiKey),
      hasDomain: Boolean(domain),
      hasFromEmail: Boolean(fromEmail),
    });
    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Mailgun not configured' }) };
  }

  const mailgun = new Mailgun(formData);
  const clientConfig = { username: 'api', key: apiKey };
  if (url) clientConfig.url = url;
  const mg = mailgun.client(clientConfig);

  const releaseFormPath = getReleaseFormPath();
  const hasAttachment = Boolean(releaseFormPath);
  const waiverUrl = getWaiverUrl();

  console.log('submission-created: preparing email', {
    formName: resolvedFormName,
    to: participantEmail,
    race,
    hasAttachment,
    hasWaiverUrl: Boolean(waiverUrl),
    mailgunUrl: url || 'default',
  });

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

  const messageBase = {
    from: fromEmail,
    to: participantEmail,
    subject: `NeuroWaves ${race} Registration Confirmation + Liability Waiver`,
    text: textLines.join('\n'),
  };

  const messageData = { ...messageBase };
  if (hasAttachment) {
    messageData.attachment = fs.createReadStream(releaseFormPath);
  }

  try {
    await mg.messages.create(domain, messageData);
    console.log('submission-created: email sent successfully', { to: participantEmail, withAttachment: hasAttachment });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (error) {
    console.error('submission-created: initial Mailgun send failed', {
      message: error?.message || String(error),
      status: error?.status || null,
      details: error?.details || null,
      withAttachment: hasAttachment,
    });

    // Common failure mode is attachment handling; retry once without attachment.
    if (hasAttachment) {
      try {
        const noAttachmentLines = [
          `Hi ${firstName},`,
          '',
          `Thanks for signing up for the NeuroWaves ${race}.`,
          waiverUrl
            ? `Please complete your liability waiver here: ${waiverUrl}`
            : 'Your liability waiver attachment could not be included automatically. We will send it shortly.',
          '',
          'Please complete it and bring it with you on race day.',
          '',
          'NeuroWaves Team',
        ];
        await mg.messages.create(domain, {
          ...messageBase,
          text: noAttachmentLines.join('\n'),
        });
        console.log('submission-created: retry without attachment succeeded', { to: participantEmail });
        return { statusCode: 200, body: JSON.stringify({ ok: true, retry: 'without-attachment' }) };
      } catch (retryError) {
        console.error('submission-created: retry without attachment failed', {
          message: retryError?.message || String(retryError),
          status: retryError?.status || null,
          details: retryError?.details || null,
        });
      }
    }

    return { statusCode: 500, body: JSON.stringify({ ok: false, message: 'Email send failed' }) };
  }
};
