const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
let getStore = null;
try {
  ({ getStore } = require('@netlify/blobs'));
} catch (_) {
  // Optional for local/non-Netlify environments.
}

// Netlify functions use a different path structure
const SIGNUPS_PATH = '/tmp/signups.csv'; // Use /tmp for serverless functions

const CSV_HEADERS = [
  'Timestamp',
  'Race',
  'FirstName',
  'LastName',
  'Email',
  'Phone',
  'EmergencyContact',
  'EmergencyPhone',
  'ShirtSize',
  'WaiverAccepted',
];

function parseEventBody(event) {
  if (!event || !event.body) return {};

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  const contentType = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(raw));
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getMailgunConfig() {
  const apiKey = process.env.MAILGUN_API_KEY || process.env.NETLIFY_EMAILS_PROVIDER_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN || process.env.NETLIFY_EMAILS_MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || process.env.FROM_EMAIL;
  const regionRaw = (process.env.MAILGUN_HOST_REGION || process.env.NETLIFY_EMAILS_MAILGUN_HOST_REGION || '').toLowerCase();
  const url = regionRaw === 'eu' ? 'https://api.eu.mailgun.net' : undefined;

  return { apiKey, domain, fromEmail, url };
}

function ensureCsvExists() {
  if (!fs.existsSync(SIGNUPS_PATH)) {
    fs.writeFileSync(SIGNUPS_PATH, CSV_HEADERS.join(',') + '\n', 'utf8');
  }
}

function escapeCsvField(value) {
  if (value == null || value === '') return '""';
  const s = String(value).trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return '"' + s + '"';
}

function buildSignupRecord(body, race) {
  return {
    timestamp: new Date().toISOString(),
    race,
    firstName: String(body.firstName ?? '').trim(),
    lastName: String(body.lastName ?? '').trim(),
    email: String(body.email ?? '').trim(),
    phone: String(body.phone ?? '').trim(),
    emergencyContact: String(body.emergencyContact ?? '').trim(),
    emergencyPhone: String(body.emergencyPhone ?? '').trim(),
    shirtSize: String(body.shirtSize ?? '').trim(),
    waiverAccepted: body.waiverAccepted === true || body.waiverAccepted === 'true' || body.waiverAccepted === 'on',
  };
}

function writeSignupCsvRow(record) {
  const row = [
    record.timestamp,
    record.race,
    record.firstName,
    record.lastName,
    record.email,
    record.phone,
    record.emergencyContact,
    record.emergencyPhone,
    record.shirtSize,
    record.waiverAccepted ? 'Yes' : 'No',
  ].map(escapeCsvField);

  fs.appendFileSync(SIGNUPS_PATH, row.join(',') + '\n', 'utf8');
}

async function persistSignupRecord(record) {
  // Keep CSV behavior for local/dev visibility.
  writeSignupCsvRow(record);

  // Persist in Netlify Blobs for durable production storage.
  if (!getStore) return;
  try {
    const store = getStore({ name: process.env.NETLIFY_SIGNUPS_STORE || 'race-signups' });
    const safeTs = record.timestamp.replace(/[:.]/g, '-');
    const recordId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : crypto.createHash('sha1').update(record.email + record.timestamp + Math.random()).digest('hex');
    const key = `${safeTs}-${recordId}.json`;
    await store.set(key, JSON.stringify(record));
  } catch (err) {
    // Keep registration successful even if Blobs is unavailable (local/dev).
    console.warn('Blobs persistence skipped:', err?.message || err);
  }
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, message: 'Method not allowed' }),
    };
  }

  try {
    ensureCsvExists();

    const body = parseEventBody(event);
    const race = body.race || 'Unknown';
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'emergencyContact', 'emergencyPhone'];
    const missingRequiredField = requiredFields.some((key) => !String(body[key] ?? '').trim());
    if (missingRequiredField || !(body.waiverAccepted === true || body.waiverAccepted === 'true' || body.waiverAccepted === 'on')) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: 'Please complete all required fields and accept the waiver.' }),
      };
    }

    const record = buildSignupRecord(body, race);
    await persistSignupRecord(record);

    // Email functionality using Mailgun
    const { apiKey, domain, fromEmail, url } = getMailgunConfig();
    const emailEnabled = Boolean(apiKey && domain && fromEmail);

    // Send email to participant with confirmation
    if (emailEnabled && body.email) {
      try {
        const mailgun = new Mailgun(formData);
        const clientConfig = { username: 'api', key: apiKey };
        if (url) clientConfig.url = url;
        const mg = mailgun.client(clientConfig);

        const emailData = {
          from: fromEmail,
          to: body.email,
          subject: `NeuroWaves Marathon - Registration Confirmation for ${race}`,
          text: `Thank you for registering for the ${race}! Your registration has been recorded. We will send you the liability waiver separately. Please check your spam folder if you don't see an email from us.`
        };

        await mg.messages.create(domain, emailData);
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Continue even if email fails
      }
    }
    
    const message = emailEnabled
      ? 'Registration recorded! Thank you! Please check your email for a confirmation message.'
      : 'Registration recorded! Thank you! We\'ll be in touch with next steps.';

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message }),
    };

  } catch (err) {
    console.error('Signup write error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, message: 'Registration could not be saved. Please try again or contact us.' }),
    };
  }
};
