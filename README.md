# NeuroWaves Marathon — Run for Epilepsy

A small event site for a marathon in support of epilepsy awareness. Built from a VP-of-Finance perspective: clear separation of registration vs. donations, single place for all sign-ups, Excel-friendly data.

## What’s included

- **Home** (`/`) — Intro, donation link, links to the three races.
- **Marathon** (`/marathon`) — 26.2 mi sign-up form.
- **Half-Marathon** (`/half-marathon`) — 13.1 mi sign-up form.
- **5K** (`/5k`) — 3.1 mi sign-up form.

All three forms submit to the same **API** and are stored in one **CSV** file (`signups.csv`) that you can open in Excel or Google Sheets. Each row includes a `Race` column (Marathon, Half-Marathon, or 5K).

Donations are **separate** from registration: an external “Donate now” link on every page (currently pointing to epilepsy.com/donate). Replace that URL in the HTML if you use a different donation-only page.

## Run locally

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## Where sign-ups are stored

After the first registration, a file **`signups.csv`** is created in the project root. New sign-ups are appended as new rows. Columns:

- Timestamp, Race, FirstName, LastName, Email, Phone, EmergencyContact, EmergencyPhone, ShirtSize, WaiverAccepted

Open `signups.csv` in Excel, Numbers, or Google Sheets to manage participants.

## Release form email

When someone signs up, the server can email them a **release/waiver form** as an attachment. They fill it out and bring it on race day.

- **Placeholder form:** Until I have the real form, a placeholder PDF is used. Create it once:

  ```bash
  npm run create-placeholder-release
  ```
  This creates `release-forms/release-form.pdf`. The same file is attached to every signup email.


- **Enabling email:** Signups are always saved to CSV. To actually send the release-form email, I will be using Mailgun API to send emails to participants.

# Email forwarding will be handled through Mailgun API, mainly via their dashboard and JavaScript integration

- **Mailgun API:** The Mailgun API will be used to send emails to participants. This helps automate the process of sending emails to participants, and reduces the need for manual email management.

# Hosting 
- **Github Hosting:** The website will be hosted through Github Pages and their DNS verification process. I am still ironing out all the details but my goal is to have the website fully functional and accessible to participants in the next couple of days.
