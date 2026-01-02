# 🏆 GEMINI Workflow Guide: AI PolyMarket Sports Picker

This guide is designed to help you (the user) and the Antigravity Agent build the AI PolyMarket Sports Picker efficiently.

---

## 🎯 Project Overview

**Goal**: Build a $0-cost ML-powered sports prediction platform integrated with Polymarket.

### Core Components
| Component | Technology | Status |
|-----------|------------|--------|
| ML Models | Python, TensorFlow/PyTorch | 🔲 TODO |
| Data Pipeline | Polymarket CLOB API, Sports APIs | 🔲 TODO |
| Backend | Supabase (Free Tier) | 🔲 TODO |
| Web App | Next.js/Vite + Vanilla CSS | 🔲 TODO |
| Mobile App | React Native / Expo | 🔲 TODO |
| Training | Google Colab / Kaggle | 🔲 TODO |

---

## 🗣️ Effective Prompting

### ✅ Good Prompts for This Project
- "Create the Polymarket sports data scraper in `src/tools/polymarket_scraper.py` using the CLOB API"
- "Set up the Supabase schema for predictions, results, and user data"
- "Build the Historical Model training notebook for Google Colab"
- "Design the prediction dashboard with a dark mode, glassmorphism UI"

### ❌ Avoid These
- "Make the app" (Too vague)
- "Train the model" (Which model? What data?)

---

## 🔄 Development Workflows

### 1. Data Pipeline Development
```
Step 1: Build Polymarket scraper → src/tools/polymarket_client.py
Step 2: Build sports history fetcher → src/tools/sports_data.py
Step 3: Create data processing pipeline → src/data/processor.py
Step 4: Store in Supabase → src/tools/supabase_client.py
```

### 2. Model Development Cycle
```
Step 1: Prepare training data → notebooks/data_prep.ipynb
Step 2: Train Historical Model → notebooks/historical_model.ipynb
Step 3: Train Sentiment Model → notebooks/sentiment_model.ipynb
Step 4: Train Hybrid Model → notebooks/hybrid_model.ipynb
Step 5: Export models → models/
```

### 3. Live Prediction Pipeline
```
Step 1: Fetch current Polymarket sports markets
Step 2: Run predictions through all 3 models
Step 3: Log predictions to Supabase
Step 4: Post-event: Label as correct/wrong
Step 5: Update rolling accuracy metrics
```

### 4. Frontend Development
```
Step 1: Set up Next.js project → web/
Step 2: Create design system → web/styles/
Step 3: Build core components → web/components/
Step 4: Connect to Supabase → web/lib/supabase.ts
Step 5: Deploy to Vercel (Free)
```

---

## 🔌 Key Integrations

### Polymarket CLOB API
```python
# Base URL
CLOB_API_URL = "https://clob.polymarket.com"

# Key Endpoints
GET /markets          # List all markets
GET /markets/{id}     # Get specific market
GET /trades           # Get trade history

# Filter for sports markets
# Markets have tags: "sports", "nba", "nfl", "soccer", etc.
```

### Supabase Schema (Proposed)
```sql
-- Predictions table
predictions (
  id UUID PRIMARY KEY,
  market_id TEXT,
  sport TEXT,
  event_name TEXT,
  predicted_outcome TEXT,
  historical_confidence FLOAT,
  sentiment_confidence FLOAT,
  hybrid_confidence FLOAT,
  actual_outcome TEXT,
  is_correct BOOLEAN,
  created_at TIMESTAMP
)

-- Model metrics table
model_metrics (
  id UUID PRIMARY KEY,
  model_type TEXT,  -- 'historical', 'sentiment', 'hybrid'
  accuracy_7d FLOAT,
  accuracy_30d FLOAT,
  total_predictions INT,
  updated_at TIMESTAMP
)
```

---

## 🎨 UI/UX Guidelines

### Design System Requirements
- **Theme**: Dark mode primary, light mode optional
- **Colors**: Deep navy/charcoal base, vibrant accent (electric blue, neon green)
- **Typography**: Inter or Outfit (Google Fonts)
- **Effects**: Glassmorphism cards, subtle gradients, micro-animations
- **Layout**: Clean, spacious, professional

### Key Screens
1. **Dashboard**: Live predictions, model accuracy, trending markets
2. **Predictions Feed**: Card-based list with confidence scores
3. **Analytics**: Charts showing model performance over time
4. **Profile**: User stats, notification preferences

---

## 📁 Proposed Project Structure

```
polymarket-predictor/
├── src/
│   ├── tools/
│   │   ├── polymarket_client.py   # CLOB API client
│   │   ├── sports_data.py         # Historical sports data
│   │   └── supabase_client.py     # Supabase operations
│   ├── data/
│   │   └── processor.py           # Data preprocessing
│   └── models/
│       ├── historical.py          # Historical model inference
│       ├── sentiment.py           # Sentiment model inference
│       └── hybrid.py              # Hybrid model inference
├── notebooks/                      # Colab/Kaggle training notebooks
│   ├── data_prep.ipynb
│   ├── historical_model.ipynb
│   ├── sentiment_model.ipynb
│   └── hybrid_model.ipynb
├── web/                           # Next.js web app
├── mobile/                        # React Native app
├── models/                        # Exported model weights
└── supabase/                      # Supabase migrations & functions
```

---

## 💰 Free Resources Checklist

| Resource | Use Case | Limit |
|----------|----------|-------|
| Google Colab | Model training | 12hr sessions, GPU access |
| Kaggle Notebooks | Backup training | 30hr/week GPU |
| Supabase Free | Backend/DB | 500MB, 50K requests/mo |
| Vercel Free | Web hosting | 100GB bandwidth |
| Expo | Mobile builds | Limited builds/mo |

---

## 🚀 Phase-by-Phase Roadmap

### Phase 1: Foundation
- [ ] Set up Supabase project
- [ ] Build Polymarket scraper
- [ ] Create data collection pipeline

### Phase 2: Models
- [ ] Prepare training datasets
- [ ] Train Historical Model (Colab)
- [ ] Train Sentiment Model (Colab)
- [ ] Train Hybrid Model (Colab)

### Phase 3: Live System
- [ ] Build prediction API
- [ ] Implement live logging
- [ ] Create accuracy tracking

### Phase 4: Frontend
- [ ] Design UI/UX mockups
- [ ] Build web app (Next.js)
- [ ] Build mobile app (React Native)

### Phase 5: Launch
- [ ] Create TikTok content
- [ ] Create Instagram content
- [ ] Beta launch
- [ ] Iterate based on feedback

---

## 🔧 Troubleshooting

### API Rate Limits
Polymarket CLOB API has rate limits. Implement:
- Request caching
- Exponential backoff
- Batch requests where possible

### Model Overfitting
Historical models can overfit. Mitigate by:
- Using the Hybrid model as primary
- Tracking live accuracy separately from backtest accuracy
- Weighting recent predictions more heavily

### Free Tier Limits
Monitor Supabase usage. If approaching limits:
- Archive old predictions
- Optimize queries
- Consider data compression

---

## 📝 Quick Reference

| Command | Description |
|---------|-------------|
| `python src/tools/polymarket_client.py` | Test Polymarket connection |
| `python src/agent.py "Get sports markets"` | Run agent task |
| `npm run dev` (in web/) | Start web development server |
| `npx expo start` (in mobile/) | Start mobile dev server |
