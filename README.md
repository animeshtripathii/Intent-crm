# Xeno Intent CRM
### AI-Native Campaign Manager for Retail & D2C Brands

A chat-first campaign agent where marketers describe their goal in plain English — Gemini AI segments the audience, drafts personalized messages, and dispatches the campaign. No form-filling. No SQL. Just intent.

**Live Demo:** [your-vercel-url]  
**GitHub:** https://github.com/animeshtripathii/Intent-crm  
**Video Walkthrough:** [your-video-url]

---

## What I Built & Why

A chat-first AI CRM for retail and D2C brands. Marketers waste time building segments manually in traditional CRMs — clicking filters, writing SQL, guessing at audiences. This product replaces all of that with a single text input. The marketer describes their goal in plain English. Gemini AI interprets the intent, builds the customer segment, drafts personalized messages, and dispatches the campaign. Chat-first means AI is the primary interface — not an optional helper bolted on the side. This is how modern CRM tools are evolving.

---

## Architecture

### System Overview

Three separate services:

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  CRM Frontend   │────▶│    CRM Backend        │────▶│   Channel Service   │
│  React + Vite   │     │  Node.js + Express    │     │  Node.js + Express  │
│  Vercel         │     │  MongoDB + Gemini AI  │     │  Railway            │
│                 │◀────│  Railway              │◀────│                     │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
  (polls /api/stats)      (/api/receipt callbacks)
```

### Data Flow

1. Marketer types intent in chat UI
2. CRM Backend calls Gemini API → gets segment JSON filters
3. Backend queries MongoDB with filters → matched customers
4. Gemini drafts personalized message per customer
5. Marketer approves → clicks "Approve & Send"
6. Backend dispatches to Channel Service in batches of 10 (parallel)
7. Channel Service simulates delivery asynchronously → callbacks to `/api/receipt`
8. CRM updates stats → Frontend polls every 3s → live feed updates

### Communication Lifecycle

```
sent → delivered (88%) → opened (45%) → read (70%) → clicked (35%)
             └──▶ failed (12%)
```

---

## AI Integration — Gemini API

Three distinct AI calls per campaign:

**Call 1 — Intent → Segment Filters**  
Natural language → structured JSON MongoDB query

| Input | Output |
|-------|--------|
| `"Win back customers who haven't bought in 60 days"` | `{ "daysSinceLastOrder": 60 }` |
| `"Reward VIP customers in Delhi with high spend"` | `{ "tags": ["vip"], "city": "Delhi", "minSpend": 15000 }` |

**Call 2 — Customer → Personalized Message**  
Per-customer context → WhatsApp message under 160 chars

Example output:
> *"Hey Priya! We miss you. Your Espresso Blend awaits — grab 15% off today: xeno.store/priya15"*

**Call 3 — Stats → AI Insight (post-campaign)**  
Campaign stats → 2–3 actionable insight sentences for the marketer

All Gemini calls use a safe `extractJSON()` wrapper that strips markdown fences before parsing — prevents crashes when Gemini wraps output in ` ```json ` blocks.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Vite + Tailwind + Recharts | Fast dev, clean UI |
| Backend | Node.js + Express | Familiar, fast |
| Database | MongoDB Atlas | Flexible schema for segment JSON |
| AI | Google Gemini 2.0 Flash | Best JSON instruction-following |
| Channel Svc | Separate Express app | Required two-service architecture |
| Hosting | Vercel (frontend) + Railway (backend) | Free tier, fast deploys |

---

## Key Tradeoffs

**MongoDB over PostgreSQL**  
Segment filters are naturally JSON documents. MongoDB lets me store `{ "city": "Delhi", "tags": ["vip"] }` directly as a query object. At scale with complex analytics I'd evaluate BigQuery.

**Polling over WebSocket**  
3-second polling for the live callback feed. Simpler to implement and sufficient for this scope. At scale with thousands of concurrent campaigns, WebSocket or SSE would reduce server load.

**Batched parallel dispatch over sequential**  
Dispatch fires in batches of 10 (`Promise.all` chunks) not one-by-one. Prevents serverless timeout and avoids overwhelming the channel service. At scale: BullMQ + Redis job queue.

**Gemini per customer for personalization**  
One Gemini call per matched customer. Fine for 300 customers. At scale: batch similar customers, generate template variations, fill programmatically.

**No auth / single user**  
Hardcoded session — implementing full auth would cost a full day for zero additional evaluation credit.

---

## Project Structure

```
xeno-crm/
├── crm-backend/
│   ├── models/          # Customer, Order, Campaign, Communication
│   ├── routes/          # campaign, receipt, stats, customers
│   ├── services/        # geminiService, segmentService, dispatchService
│   ├── seed/            # 300 customers + 715 orders across 6 segments
│   └── server.js
├── crm-frontend/
│   └── src/
│       ├── pages/       # Dashboard, NewCampaign, CampaignAnalytics
│       └── components/  # StatusBadge
└── channel-service/
    ├── routes/          # simulate.js
    └── services/        # simulator.js (async callbacks + retry)
```

---

## Running Locally

**Prerequisites:** Node.js 18+, MongoDB Atlas account, Gemini API key

```bash
# Clone the repo
git clone https://github.com/animeshtripathii/Intent-crm.git
cd Intent-crm/xeno-crm

# Install dependencies
cd crm-backend && npm install
cd ../channel-service && npm install
cd ../crm-frontend && npm install

# Set up environment variables
cp crm-backend/.env.example crm-backend/.env
cp channel-service/.env.example channel-service/.env
cp crm-frontend/.env.example crm-frontend/.env
# Fill in MONGODB_URI and GEMINI_API_KEY in crm-backend/.env

# Seed the database (creates 300 customers + orders)
cd crm-backend && node seed/seedData.js

# Start all 3 services (open 3 terminals)
cd crm-backend && node server.js          # → http://localhost:5000
cd channel-service && node server.js      # → http://localhost:5001
cd crm-frontend && npm run dev            # → http://localhost:3000
```

Open **http://localhost:3000**

---

## Seed Data

300 customers across 6 realistic segments:

| Segment | Count | Characteristics |
|---------|-------|-----------------|
| VIP | 30 | spend >₹15k, orders >8, active |
| Lapsed | 60 | no purchase in 60–120 days |
| New | 50 | 1–2 orders, joined recently |
| Repeat | 80 | 3–7 orders, consistent buyers |
| Dormant | 50 | no purchase in 120+ days |
| High-spend low-freq | 30 | spend >₹10k but <4 orders |

**Cities:** Delhi, Mumbai, Bangalore, Hyderabad, Chennai, Pune  
**Categories:** coffee, fashion, beauty, electronics, home, fitness

---

## Scale Assumptions

This system is designed for a demo with 300 customers. Production considerations I would address at scale:

- **Message dispatch:** Replace batched `Promise.all` with BullMQ + Redis queue for reliable at-scale job processing
- **Gemini calls:** Batch similar customers, generate template variations rather than one call per customer
- **Callback ingestion:** Add idempotency keys to `/api/receipt` to handle duplicate callbacks from the channel service
- **Live feed:** Replace 3s polling with WebSocket or Server-Sent Events
- **Database:** Add compound indexes on `(campaignId + status)` in communications collection for faster analytics queries

---

## AI-Native Development Workflow

I used AI throughout the build, not just as autocomplete:

- **Architecture decisions:** Used Claude to critique the blueprint and identify 3 critical risks — JSON parsing failures, sequential dispatch bottleneck, and aggressive timeline
- **Code generation:** Prompted Claude for each service with precise specs, reviewed all output before accepting
- **Debugging:** When Gemini returned markdown-wrapped JSON, diagnosed and fixed the `extractJSON()` parser with AI assistance
- **Prompt engineering:** Iterated the intent-to-segment system prompt multiple times until it reliably returned structured JSON
- **Approach:** AI as a fast junior developer — it drafts, I review, correct, and own everything that ships

---

## Environment Variables

**`crm-backend/.env`**
```env
MONGODB_URI=mongodb+srv://...
GEMINI_API_KEY=AIzaSy...
CHANNEL_SERVICE_URL=https://your-channel-service.railway.app
CRM_PUBLIC_URL=https://your-crm-backend.railway.app
PORT=5000
```

**`channel-service/.env`**
```env
CRM_RECEIPT_URL=https://your-crm-backend.railway.app/api/receipt
PORT=5001
```

**`crm-frontend/.env`**
```env
VITE_API_URL=https://your-crm-backend.railway.app
```

---

> **Note:** Replace all placeholder URLs with actual deployed URLs once Railway and Vercel deployment is complete.
