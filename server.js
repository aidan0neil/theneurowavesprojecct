/**
 * NeuroWaves Marathon — backend
 * Collects sign-ups from Marathon, Half-Marathon, and 5K into one CSV (Excel-ready).
 * Emails each participant a release form attachment (placeholder until you replace the file).
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const nodemailer = require('nodemailer');
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const app = express();
const PORT = process.env.PORT || 3000;
const SIGNUPS_PATH = path.join(__dirname, 'signups.csv');
const RELEASE_FORM_PATH = path.join(__dirname, 'release-forms', 'release-form.pdf');

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

function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(port),
    secure: port === '465',
    auth: { user, pass },
  });
}

function getMailgunClient() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) return null;
  
  const mailgun = new Mailgun(formData);
  return mailgun.client({ username: 'api', key: apiKey });
}

async function sendReleaseFormEmail(participant) {
  console.log('Attempting to send email to:', participant.email);
  
  const mailgunClient = getMailgunClient();
  const transporter = getMailer();
  
  console.log('Mailgun client available:', !!mailgunClient);
  console.log('SMTP transporter available:', !!transporter);
  
  if (!mailgunClient && !transporter) {
    console.warn('Email not sent: Neither Mailgun nor SMTP configured.');
    return;
  }

  const hasAttachment = fs.existsSync(RELEASE_FORM_PATH);
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER || process.env.MAILGUN_FROM_EMAIL;
  const subject = 'NeuroWaves — Your registration confirmation & release form';

  const html = `
    <p>Hi ${participant.firstName},</p>
    <p>Thank you for registering for the NeuroWaves ${participant.race}!</p>
    <p>Please find attached the <strong>release and waiver form</strong>. Fill it out and bring it with you on race day. We’ll collect it before you run.</p>
    ${hasAttachment ? '' : '<p><em>(The official release form will be sent separately; you will receive it soon.)</em></p>'}
    <p>We’re grateful you’re part of this event for epilepsy awareness.</p>
    <p>— The NeuroWaves Team</p>
  `.trim();

  try {
    if (mailgunClient) {
      console.log('Using Mailgun to send email...');
      const messageData = {
        from: from || `postmaster@${process.env.MAILGUN_DOMAIN}`,
        to: participant.email,
        subject,
        html,
      };

      if (hasAttachment) {
        messageData.attachment = fs.createReadStream(RELEASE_FORM_PATH);
      }

      console.log('Mailgun message data:', { ...messageData, attachment: hasAttachment ? 'PDF file' : 'none' });
      
      const result = await mailgunClient.messages.create(process.env.MAILGUN_DOMAIN, messageData);
      console.log('Mailgun success:', result);
      console.log('Mailgun email sent to', participant.email);
    } else {
      console.log('Using SMTP to send email...');
      const mailOptions = {
        from: from || 'noreply@neurowaves.org',
        to: participant.email,
        subject,
        html,
        attachments: hasAttachment
          ? [{ filename: 'NeuroWaves-Release-Form.pdf', content: fs.readFileSync(RELEASE_FORM_PATH) }]
          : [],
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('SMTP success:', result);
      console.log('SMTP email sent to', participant.email);
    }
  } catch (error) {
    console.error('Email send error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Page routes before static so /gallery and others are always served correctly
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/marathon', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marathon.html'));
});
app.get('/half-marathon', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'half-marathon.html'));
});
app.get('/5k', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', '5k.html'));
});
app.get('/gallery', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'gallery.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/signup', async (req, res) => {
  ensureCsvExists();

  const body = req.body || {};
  const race = body.race || 'Unknown';
  const row = [
    new Date().toISOString(),
    race,
    body.firstName ?? '',
    body.lastName ?? '',
    body.email ?? '',
    body.phone ?? '',
    body.emergencyContact ?? '',
    body.emergencyPhone ?? '',
    body.shirtSize ?? '',
    body.waiverAccepted === true || body.waiverAccepted === 'on' ? 'Yes' : 'No',
  ].map(escapeCsvField);

  try {
    fs.appendFileSync(SIGNUPS_PATH, row.join(',') + '\n', 'utf8');

    // Send release form email (non-blocking; don’t fail signup if email fails)
    const participant = {
      firstName: (body.firstName || '').trim() || 'Participant',
      email: (body.email || '').trim(),
      race,
    };
    const emailEnabled = !!(getMailer() || getMailgunClient());
    if (participant.email && emailEnabled) {
      sendReleaseFormEmail(participant)
        .then(() => console.log('Release form email sent to', participant.email))
        .catch((err) => {
          console.error('Release-form email error:', err.message);
        });
    }

    const message = emailEnabled
      ? 'Registration recorded. Thank you! Check your email for your release form—fill it out and bring it on race day.'
      : 'Registration recorded. Thank you!';
    res.status(200).json({ ok: true, message });
  } catch (err) {
    console.error('Signup write error:', err);
    res.status(500).json({ ok: false, message: 'Registration could not be saved. Please try again or contact us.' });
  }
});

app.listen(PORT, () => {
  ensureCsvExists();
  console.log(`NeuroWaves Marathon server running at http://localhost:${PORT}`);
  if (!getMailer() && !getMailgunClient()) {
    console.log('Tip: Configure either SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS) or Mailgun (MAILGUN_API_KEY, MAILGUN_DOMAIN) to email release forms.');
  } else if (!fs.existsSync(RELEASE_FORM_PATH)) {
    console.log('Tip: Run "npm run create-placeholder-release" to create the release form attachment, or add release-forms/release-form.pdf');
  }
});
