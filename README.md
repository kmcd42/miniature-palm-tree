# Compound

A personal wealth dashboard PWA that integrates your **weekly budget**, **mortgage**, **investments**, and **savings goals** into one intuitive, mobile-first interface.

## Philosophy

Compound thinks about money the way you do:
- **Weekly budgeting** aligned with your pay cycle
- **Long-term wealth visualization** showing your path to retirement
- **No bank connections** - you control your data through the Payday feature
- **Swedish rounding** - all amounts rounded to the nearest dollar for simplicity

## Features

### Payday Tracking
Log your savings contributions each pay period without connecting to your bank:
- Configurable pay frequency: weekly, fortnightly (default), or monthly
- Adjust amounts with +/- stepper buttons
- See new balances for linked savings buckets and investments
- All savings items from your budget appear automatically

### Weekly Budget
- Categorize expenses as **Necessity** (red), **Cost** (orange), or **Savings** (green)
- Automatic conversion from monthly/yearly to weekly amounts
- Parent-child hierarchy for grouped expenses (e.g., "Subscriptions" with children)
- Linked budget items auto-sync with investments and savings buckets
- Real-time uncommitted income calculation

### Wealth Dashboard
The home screen shows:
- **Budget summary** with category breakdown and progress bar
- **Scorecard row** - Investments, Mortgage, and Top Goal at a glance
- **Wealth projection graph** showing your path to retirement
- **Savings buckets** quick view

### Investments
- Track ETFs, KiwiSaver, and other investments
- Weekly contribution tracking with DCA projections
- Fee-adjusted compound interest calculations
- Projected values with inflation adjustment

### Mortgage
- Track principal, payments, and extra contributions
- Property value and equity tracking
- Shared housing expense splitting by income ratio
- Payoff projections showing interest saved from extra payments

### Goals
- **Emergency Fund**: Auto-calculated from X months of expenses (necessities + costs)
- **Wealth Targets**: Set a target amount with optional deadline
- **Time-Specific Goals**: Calculate weekly savings needed to reach goal
- **Savings Buckets**: Track individual savings for travel, tech, etc.

## Design System

Compound uses a distinctive visual design:
- **Deep navy background** (`#0a0f1a`) with breathing glowing orbs
- **Cream bento boxes** (`#FBF7F0`) for cards
- **Yellow accents** (`#F5C542`) for buttons and interactive elements
- **Instrument Serif** for headings and large numbers
- **Film grain texture** overlay for visual depth
- Green/red semantic colors preserved for money values

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** with custom design tokens
- **React Context + useReducer** for state management
- **localStorage** for data persistence (no account needed)
- **PWA** with service worker for offline support

## Architecture

### Data Model
```
BudgetStore
├── settings (age, income, pay frequency, etc.)
├── budgetItems[] (with parent-child relationships)
├── investments[] (with linked budget items)
├── savingsBuckets[] (with linked budget items)
├── mortgages[]
├── goals[]
└── sharedHousing? (optional partner expense splitting)
```

### Key Calculations (`src/lib/calculations.ts`)

**Weekly Conversion**
```typescript
toWeekly(amount, frequency) // Convert any frequency to weekly
fromWeekly(weeklyAmount, targetFrequency) // Convert back
```

**Effective Category Totals**
```typescript
calculateWeeklyByCategoryEffective(items)
// Handles parent-child relationships correctly to avoid double-counting
```

**DCA (Dollar Cost Averaging)**
```
FV = P × ((1 + r)^n - 1) / r
```
Where P = weekly contribution, r = weekly rate, n = weeks

**Inflation Adjustment**
```
Real Value = Nominal Value / (1 + inflation)^years
```

**Emergency Fund Target**
```typescript
// Includes necessities AND costs (not just necessities)
monthlyExpenses = (weeklyNecessities + weeklyCosts) × 52 / 12
target = monthlyExpenses × monthsOfExpenses
```

### Storage
- Primary key: `compound-data`
- Automatic migration from legacy `budget-clarity-data` key
- Version field for future schema migrations
- Export/Import JSON backups in Settings

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Other Platforms
Any platform supporting Next.js: Netlify, Cloudflare Pages, Railway, etc.

## Data Privacy

- All data stored locally in your browser's localStorage
- No cloud sync, no accounts, no tracking
- Export/Import JSON backups for portability
- Data stays on your device

## Changelog

### Latest
- **Renamed** from "Budget Clarity" to "Compound"
- **Added** Payday feature for logging savings contributions
- **Redesigned** homepage with scorecard row and wealth graph
- **New design system** with navy background, cream cards, yellow accents
- **Fixed** budget calculations to handle parent-child relationships
- **Fixed** emergency fund to include costs, not just necessities

## License

MIT
