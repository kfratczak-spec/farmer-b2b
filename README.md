# Farmer B2B - Tutlo System Zarządzania Grupami

Pełnofunkcyjna aplikacja Next.js do zarządzania grupami szkoleniowych oraz monitorowania wykorzystania pakietów minutowych dla kursów angielskiego sprzedawanych biznesie.

## Cechy

- **Autentykacja**: Prosty system logowania z dwoma rolami (sprzedawca i szef sprzedaży)
- **Dashboard**: Przegląd grup i ticketów z filtrami wyszukiwania
- **System ticketów**: Automatyczne alerty o niskim wykorzystaniu minut
- **Analityka**: Wykresy wykorzystania z prognozą na podstawie trendów
- **Dane mockowe**: ~50 grup rozłożonych na 6 sprzedawców z realistycznymi wzorami wykorzystania

## Instalacja

```bash
npm install
npm run dev
```

Aplikacja uruchomi się na http://localhost:3000

## Dane testowe

### Sprzedawca
- Imię: **Andrzej**
- Nazwisko: **Nowak**
- Hasło: **tutlo**

### Szef sprzedaży
- Imię: **Jan**
- Nazwisko: **Administrator**
- Hasło: **tutlo**

## Struktura projektu

```
src/
├── app/
│   ├── api/           # API routes (auth, groups, tickets)
│   ├── dashboard/     # Dashboard page
│   ├── groups/        # Groups listing and detail pages
│   ├── tickets/       # Tickets listing page
│   ├── login/         # Login page
│   ├── layout.tsx     # Root layout
│   ├── page.tsx       # Root redirect
│   └── globals.css    # Global styles
├── components/        # React components
│   ├── Header.tsx
│   ├── GroupCard.tsx
│   ├── TicketCard.tsx
│   ├── StatsCard.tsx
│   └── UtilizationChart.tsx
└── lib/              # Utilities and data
    ├── data.ts       # Mock data generation
    ├── tickets.ts    # Ticket algorithm
    └── forecast.ts   # Forecasting calculations
```

## Funkcjonalności API

### POST /api/auth
Login - zwraca user info i token

### GET /api/groups
Listę grup (filtrowana na podstawie roli)

### GET /api/groups/[id]
Szczegóły grupy z historią utilizacji

### GET /api/tickets
Lista ticketów (filtrowana na podstawie roli)

## Algorytm ticketów

System automatycznie tworzy tickety na podstawie:
- **Oczekiwane wykorzystanie**: liniowe do 75% do końca umowy
- **Rzeczywiste wykorzystanie**: obliczone z codziennego użycia
- **Poziom ryzyka**:
  - **Krytyczne** (czerwony): >25% poniżej oczekiwanego
  - **Wysokie ryzyko** (pomarańczowy): >10% poniżej oczekiwanego
  - **Niskie ryzyko** (żółty): <10% poniżej oczekiwanego

## Prognozowanie

Prognozy oparte są na:
- Średnim dziennym użyciu z ostatnich 14 dni
- Liczbie dni pozostałych do końca umowy
- Aktualnemu tempie konsumpcji minut

## Kolorowanie

- **Zielony** (80%+): Dobra utilizacja
- **Żółty** (60-80%): Średnia utilizacja
- **Pomarańczowy** (40-60%): Niska utilizacja
- **Czerwony** (<40%): Krytycznie niska utilizacja

## Budowanie

```bash
npm run build
npm start
```

## Technologia

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Recharts (wykresy)
