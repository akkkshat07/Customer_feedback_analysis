# Customer Feedback Analysis (CFA)

An AI-powered customer feedback intelligence platform for **Esme Beauty & Skincare**. Ingests feedback from multiple sources (Amazon, Nykaa, social media, customer care), performs automated sentiment analysis and complaint categorization, and surfaces actionable insights through an interactive dashboard and AI chat interface.

---

## Features

- **Multi-source Data Ingestion** — Upload CSV/XLSX files with smart column auto-detection
- **Automated Sentiment Analysis** — Classifies feedback as Positive, Negative, or Neutral
- **Complaint Categorization** — 14 regex-based categories (Packaging, Quality, Delivery, Counterfeit, etc.)
- **Interactive Dashboard** — KPI cards, trend charts, top categories, and recent complaints
- **Product Analytics** — Per-product sentiment trends, source breakdowns, and paginated feedback
- **AI Chat Agent** — Gemini-powered natural language queries over your feedback data
- **Dark Mode** — Full dark theme with smooth transitions
- **Responsive Design** — Desktop, tablet, and mobile layouts

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js 5 |
| Database | PostgreSQL |
| AI | Google Gemini 2.5 Flash (`@google/generative-ai`) |
| File Parsing | `xlsx`, `csv-parse` |
| Sentiment | `sentiment.js` |
| File Upload | Multer |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite |
| Routing | React Router DOM 6 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| HTTP Client | Axios |
| Animations | GSAP |
| Markdown | React Markdown + remark-gfm |

---

## Project Structure

```
cfa/
├── backend/
│   ├── server.js           # Express app entry point
│   ├── db.js               # PostgreSQL connection pool
│   ├── schema.sql          # Database schema
│   ├── routes/
│   │   ├── upload.js       # File upload & ingestion
│   │   ├── analytics.js    # Analytics API endpoints
│   │   └── chat.js         # AI chat with Gemini
│   ├── services/
│   │   └── processData.js  # Data normalization & sentiment pipeline
│   └── uploads/            # Temporary file storage
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Root layout, routing, dark mode
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── Upload.jsx
│   │   │   └── Chat.jsx
│   │   └── components/
│   │       └── Chatbot.jsx
│   └── vite.config.js
└── Esme-Logo-01.webp
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
psql -U postgres -c "CREATE DATABASE customer_feedback;"
psql -U postgres -d customer_feedback -f backend/schema.sql
```

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5176
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DATABASE=customer_feedback
GEMINI_API_KEY=your_gemini_api_key_here
```

```bash
node server.js
# Server runs at http://localhost:5176
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server runs at http://localhost:5173
```

> The frontend dev server proxies `/api` requests to the backend at `http://localhost:5000`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/upload` | Upload CSV/XLSX feedback files |
| `GET` | `/api/analytics/dashboard-data` | Aggregated dashboard metrics |
| `GET` | `/api/analytics/products` | All products summary |
| `GET` | `/api/analytics/products/:name` | Single product detail + feedback |
| `GET` | `/api/analytics/product-categories` | Brand/category stats |
| `POST` | `/api/chat` | AI chatbot (Gemini) |

---

## Building for Production

```bash
cd frontend
npm run build
# Output in frontend/dist/
# Served under base path /cfa/
```

---

## Branding

Primary color: `#0d968b` (teal) — Esme Beauty & Skincare
