# 🏆 AI PolyMarket Sports Picker

An ML-powered sports prediction platform that integrates with Polymarket betting markets. Uses three specialized models (Historical, Sentiment, Hybrid) to predict sports outcomes and track accuracy in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10+-green.svg)
![Status](https://img.shields.io/badge/status-in%20development-yellow.svg)

## 🎯 Features

- **Polymarket Integration** - Fetches live sports betting markets from Polymarket CLOB API
- **3 ML Models** - Historical (XGBoost), Sentiment (Neural Network), Hybrid (Ensemble)
- **Free Training** - Designed for Google Colab/Kaggle (no GPU costs)
- **Real-time Tracking** - Logs predictions and tracks rolling accuracy via Supabase
- **ESPN Data Pipeline** - Historical sports data from ESPN's free API

## 📊 Current Stats

| Metric | Value |
|--------|-------|
| Sports Markets Collected | 2,011 |
| Training Examples | 1,812 |
| Sports Covered | NBA, NFL, MLB, NHL, MMA, Soccer |
| Date Range | June 2022 - September 2024 |

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/KevinGastelum/ai-polymarket-sportspicker.git
cd ai-polymarket-sportspicker
```

### 2. Install Dependencies

```bash
pip install requests pydantic python-dotenv
```

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials (optional for dev)
```

### 4. Test the Data Pipeline

```bash
# Fetch Polymarket sports markets
python src/tools/polymarket_client.py

# Fetch sports data from ESPN
python src/tools/sports_data.py

# Process data for ML training
python src/data/processor.py
```

## 🧠 ML Models

### Historical Model
Uses team records, win percentages, and historical performance patterns.
- **Algorithm**: XGBoost Classifier
- **Training**: `notebooks/historical_model.py`

### Sentiment Model  
Uses market prices as a proxy for collective sentiment/confidence.
- **Algorithm**: TensorFlow Neural Network
- **Training**: `notebooks/sentiment_model.py`

### Hybrid Model
Stacking ensemble that combines both models for optimal predictions.
- **Algorithm**: Meta-learner (Logistic Regression)
- **Training**: `notebooks/hybrid_model.py`

## 📁 Project Structure

```
ai-polymarket-sportspicker/
├── src/
│   ├── tools/
│   │   ├── polymarket_client.py   # Polymarket CLOB API client
│   │   ├── sports_data.py         # ESPN API integration
│   │   └── supabase_client.py     # Database client
│   └── data/
│       └── processor.py           # Data processing pipeline
├── notebooks/
│   ├── data_prep.py               # Data preparation & EDA
│   ├── historical_model.py        # XGBoost training
│   ├── sentiment_model.py         # Neural network training
│   └── hybrid_model.py            # Ensemble training
├── supabase/
│   ├── schema.sql                 # Database schema
│   └── README.md                  # Setup guide
├── .env.example                   # Environment variables template
├── mission.md                     # Project mission & goals
└── GEMINI.md                      # Development workflow guide
```

## 🗄️ Database Setup (Supabase)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run `supabase/schema.sql`
4. Copy your API credentials to `.env`

See [supabase/README.md](supabase/README.md) for detailed instructions.

## 📓 Training on Google Colab

1. Upload notebooks to Google Colab
2. Upload `artifacts/processed_data/` files or connect to Google Drive
3. Run notebooks in order:
   - `data_prep.py` → Feature engineering
   - `historical_model.py` → Train XGBoost
   - `sentiment_model.py` → Train Neural Network
   - `hybrid_model.py` → Create ensemble

## 🔌 APIs Used

| API | Purpose | Cost |
|-----|---------|------|
| [Polymarket CLOB](https://docs.polymarket.com/) | Betting markets | Free |
| [ESPN](https://site.api.espn.com) | Sports data | Free |
| [Ball Don't Lie](https://www.balldontlie.io/) | NBA stats | Free |
| [Supabase](https://supabase.com) | Database | Free tier |

## 🛣️ Roadmap

- [x] Phase 1: Data Pipeline
- [x] Phase 2: ML Training Notebooks
- [x] Phase 3: Supabase Setup
- [ ] Phase 4: Live Prediction System
- [ ] Phase 5: Web Dashboard (Next.js)
- [ ] Phase 6: Mobile App (React Native)
- [ ] Phase 7: TikTok/Instagram Content

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This project is for educational purposes only. Sports betting involves risk. Always gamble responsibly and be aware of the laws in your jurisdiction.

---

**Built with ❤️ by [Kevin Gastelum](https://github.com/KevinGastelum)**
