# Sehsuechte — Exhibition NFC App

A Next.js web app that allows visitors to scan NFC tags at artworks throughout the exhibition, building a personal collection that is displayed at the end of their visit.

---

## How it works

1. Visitor taps the **entrance NFC tag** → checks in with their name
2. Visitor taps **artwork NFC tags** throughout the exhibition → each artwork is added to their collection
3. Visitor taps the **exit NFC tag** → sees a summary of all artworks they scanned

---

## Tech Stack

- **Next.js** — frontend framework
- **Supabase** — database and API
- **Vercel** — hosting

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/bungedrews/sehsuechte.git
cd sehsuechte
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root of the project:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

I added the correct credentials to our Notion, they are the same as the ones you made for the previous project

### 4. Run locally

```basho
npm run dev
```

The app will be running at `http://localhost:3000`

---

## Pages & Endpoints

### `/checkin`

**Triggered by:** Entrance NFC tag  
**What it does:** Displays a name input form. On submission, creates a new session in Supabase and saves the session ID to localStorage.

---

### `/like?code=artwork-01`

**Triggered by:** Artwork NFC tags  
**What it does:** Reads the session ID from localStorage. Looks up the artwork by its `nfc_code` in Supabase, then saves a scan record linking the session to the artwork. Shows a confirmation message.  
**Query parameter:** `code` — must match the `nfc_code` field in the `artworks` table in Supabase.

---

### `/summary`

**Triggered by:** Exit NFC tag  
**What it does:** Reads the session ID from localStorage, marks the session as ended, and fetches all scanned artworks for that session. Displays the visitor's personal collection.

---

## Database Schema

### `sessions`

| column     | type      | notes                       |
| ---------- | --------- | --------------------------- |
| id         | uuid      | primary key, auto-generated |
| name       | text      | entered at check-in         |
| created_at | timestamp | set on check-in             |
| ended_at   | timestamp | set on exit, nullable       |

### `artworks`

| column      | type | notes                                           |
| ----------- | ---- | ----------------------------------------------- |
| id          | uuid | primary key                                     |
| nfc_code    | text | unique, matches URL parameter e.g. `artwork-01` |
| title       | text |                                                 |
| artist      | text |                                                 |
| description | text |                                                 |
| image_url   | text |                                                 |

### `scans`

| column     | type      | notes                  |
| ---------- | --------- | ---------------------- |
| id         | uuid      | primary key            |
| session_id | uuid      | references sessions.id |
| artwork_id | uuid      | references artworks.id |
| scanned_at | timestamp | auto-generated         |

---

## NFC Tags

| Tag                | URL                                           |
| ------------------ | --------------------------------------------- |
| Entrance           | `https://yourdomain.com/checkin`              |
| Artwork (each one) | `https://yourdomain.com/like?code=artwork-01` |
| Exit               | `https://yourdomain.com/summary`              |

NFC tags are written using the **NFC Tools** app on iPhone.

---

## Project Structure

```
├── app/
│   ├── page.js          # Home / welcome screen
│   ├── checkin/
│   │   └── page.js      # Check-in page
│   ├── like/
│   │   └── page.js      # Artwork scan handler
│   └── summary/
│       └── page.js      # End of visit summary
├── lib/
│   └── supabase.js      # Supabase client
├── .env.local           # Environment variables (not in repo)
└── README.md
```

End points if you don't have nfc tags to test:
http://localhost:3000/like?code=artwork-01
http://localhost:3000/like?code=artwork-02
http://localhost:3000/like?code=artwork-03
http://localhost:3000/like?code=artwork-04
http://localhost:3000/like?code=artwork-05

Page that gives you an updated list of artworks you liked as you tap through exhibition:
http://localhost:3000/checkin/ready

Personal journey summary:
http://localhost:3000/summary

Comparison to other visitors:
http://localhost:3000/summary
