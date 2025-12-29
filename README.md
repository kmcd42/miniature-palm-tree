# Budget Clarity

A personal budgeting PWA that thinks about money the way you do: **weekly budget** and **long-term wealth**.

## Features

### Weekly Budget View
- Track all expenses categorized as **Necessity**, **Cost**, or **Savings**
- Automatic conversion of monthly/yearly expenses to weekly amounts
- See uncommitted income at a glance
- Sub-items for detailed breakdown (e.g., subscriptions under "Regular Expenses")

### Wealth Tracking
- **Investments**: Track ETFs, KiwiSaver, and other investments
- **DCA Projections**: Compound interest calculations for regular contributions
- **Mortgage**: Track balance, payments, and see how extra payments save interest
- **Net Wealth**: Current and projected at 1yr, 5yr, and retirement

### Goals
- **Emergency Fund**: Auto-calculated from X months of necessity expenses
- **Wealth Targets**: Set a target amount with optional deadline
- **Time-Specific Goals**: e.g., "Paternity fund by 2030" with weekly savings needed
- **Savings Buckets**: Travel, Tech, etc. with progress tracking

### Projections
- Inflation-adjusted (real) future values
- Compound interest for DCA investments
- Mortgage payoff projections with extra payment scenarios
- Wealth at retirement (age 70 by default, configurable)

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** with iOS-inspired "Liquid Glass" design
- **localStorage** for data persistence (no account needed)
- **PWA** with offline support

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

### Other platforms
Any platform that supports Next.js: Netlify, Cloudflare Pages, Railway, etc.

## Generate App Icons

For proper PWA icons (optional):
```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

## Data

- All data stored locally in your browser
- Export/Import JSON backups in Settings
- No cloud sync, no accounts, full privacy

## Financial Calculations

### DCA (Dollar Cost Averaging)
Uses future value of annuity formula with weekly compounding:
```
FV = P × ((1 + r)^n - 1) / r
```
Where P = weekly contribution, r = weekly rate, n = weeks

### Inflation Adjustment
Future values converted to today's purchasing power:
```
Real Value = Nominal Value / (1 + inflation)^years
```

### Mortgage Payoff
Iterative amortization calculation showing:
- Months remaining
- Total interest paid
- Impact of extra payments

## License

MIT
