# Customer Feedback Analysis (CFA)

An AI-powered customer feedback intelligence platform for **Esme Beauty & Skincare**. Ingests feedback from multiple sources (Amazon, Nykaa, social media, customer care), performs automated AI-driven sentiment analysis and complaint categorization, and surfaces actionable insights through an interactive dashboard and AI chat interface.

---

## 🚀 Key Features

- **AI-Driven Data Ingestion** — Automatic sentiment analysis and categorization using **Google Gemini 2.0 Flash**.
- **Multi-source Support** — Upload CSV/XLSX files with smart column auto-detection.
- **Unified Analytics** — Single source of truth for all customer feedback across platforms.
- **AI Chat Agent (Esme)** — Natural language queries over live feedback data with function calling for precise SQL analytics.
- **Semantic Search** — Find relevant feedback using AI-powered keyword and vector matching.
- **Interactive Dashboard** — KPI cards, monthly trends, and product-level deep dives.
- **Dark Mode** — Modern, responsive UI with GSAP animations.

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL (with `pgvector` support)
- **AI Models:** 
  - `gemini-2.0-flash` (Sentiment & Categorization)
  - `text-embedding-004` (Semantic Search)
- **File Parsing:** `xlsx`, `csv-parse`

### Frontend
- **Framework:** React 18 (Vite)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Animations:** GSAP
- **HTTP Client:** Axios

---

## 📁 Project Structure

```
cfa/
├── backend/
│   ├── server.js           # Express app (Port 5000)
│   ├── db.js               # PostgreSQL connection
│   ├── schema.sql          # Database schema (feedback.complaints)
│   ├── database_setup.js   # Setup script
│   ├── routes/
│   │   ├── upload.js       # File upload & AI ingestion
│   │   ├── analytics.js    # Dashboard & Product APIs
│   │   └── chat.js         # AI Agent with Gemini
│   └── services/
│       └── processData.js  # AI Sentiment & Categorization pipeline
└── frontend/               # React + Vite app
```

---

## 🚦 Getting Started

### 1. Database Setup
Ensure PostgreSQL is running, then create the database and run the setup script:

```bash
psql -U postgres -c "CREATE DATABASE customer_feedback;"
cd backend
npm install
# Configure .env first (see below)
node database_setup.js
```

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=customer_feedback
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Run the Application

**Backend:**
```bash
cd backend
node server.js
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173/cfa/`

---

## 📊 AI Analysis Categories
When data is uploaded, Esme AI automatically classifies complaints into:
- Packaging Issue
- Health/Allergy Issue
- Counterfeit Concern
- Product Performance
- Product Quality
- Smell Issue
- Damaged Product
- Late Delivery
- Wrong Item
- Printing & Labeling
- Customer Service
- Other

---

## 🤝 Branding
Primary color: `#0d968b` (Teal) — Esme Beauty & Skincare.
Developed for internal data intelligence and customer experience optimization.
