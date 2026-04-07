# Farmer B2B - Kontekst Projektu

> Ostatnia aktualizacja: 2026-04-07 | Wersja: v2026-04-07

## 1. Czym jest Farmer B2B?

Wewnętrzna aplikacja webowa dla zespołu sprzedaży B2B w firmie **Tutlo** (platforma do nauki języka angielskiego). Tutlo sprzedaje firmom pakiety minut lekcji angielskiego dla ich pracowników. Farmer B2B pozwala handlowcom monitorować wykorzystanie minut przez grupy kursantów, automatycznie generuje tickety gdy wykorzystanie spada, i pomaga identyfikować okazje do upsell.

**Właściciel projektu:** Konrad Frątczak (k.fratczak@tutlo.pl) - Head of CRM & Marketing Automation w Tutlo. Konrad nie jest programistą - potrzebuje prostych instrukcji krok po kroku do operacji Git i deployment.

## 2. Stack technologiczny

- **Frontend + Backend:** Next.js 16.2.1 (App Router) z TypeScript
- **Styling:** Tailwind CSS 4.2.2
- **Wykresy:** Recharts 3.8.1
- **Raporty Excel:** xlsx 0.18.5
- **Hosting:** Vercel (auto-deploy z GitHub push na `main`)
- **Storage:** Vercel KV (Upstash Redis) - dane użytkowników, prefix `KV_`
- **Repozytorium:** github.com/kfratczak-spec/farmer-b2b
- **URL produkcyjny:** farmer-b2b.vercel.app
- **Vercel team:** kfratczak-2288s-projects (team_T9GGBKoBpPQegGHHDGAyF2WD)
- **Środowisko lokalne Konrada:** Windows, PowerShell (nie obsługuje `&&`, używać `;` lub osobne komendy)

## 3. Źródło danych

- Docelowo: **Google Sheets** (publikowany jako CSV) - aktualnie zwraca 401, do naprawy
- Tymczasowo: **dane embedded** w `src/lib/data.ts` jako fallback (7316 sesji, 47 grup)
- **Vercel KV** dla danych użytkowników (trwały zapis, nie resetuje się przy redeploy)
- **In-memory** dla danych runtime (aktywności, historia ticketów, scoring) - resetują się przy redeploy. Do rozwiązania w przyszłości (Vercel Postgres lub Supabase).

## 4. Autentykacja i zarządzanie użytkownikami

- Token Base64 w header `Authorization: Bearer <token>`
- Token zawiera: `name`, `role`, `fullName`, `isAdmin`
- Bez podpisu kryptograficznego (tymczasowe rozwiązanie)
- Dwie role: `admin` (mapowany na `head_of_sales` dla backward compat) i `salesperson`
- Logowanie przez dropdown z listą aktywnych użytkowników (GET `/api/auth`)
- **Panel Admin** (`/admin/users`): zarządzanie użytkownikami (dodawanie, zmiana roli, dezaktywacja)
- Dane użytkowników w Vercel KV (`src/lib/users.ts`) z in-memory fallback
- 15 domyślnych użytkowników seedowanych przy pierwszym uruchomieniu

## 5. Struktura plików

```
src/
├── app/
│   ├── page.tsx                     # Strona główna (redirect do login)
│   ├── login/page.tsx               # Logowanie (dropdown użytkowników)
│   ├── dashboard/page.tsx           # Dashboard główny
│   ├── admin/
│   │   └── users/page.tsx           # Panel administracyjny (zarządzanie użytkownikami)
│   ├── activity-dashboard/page.tsx  # Dashboard aktywności i scoringu
│   ├── tickets/page.tsx             # Lista ticketów (otwarte/zamknięte)
│   ├── groups/
│   │   ├── page.tsx                 # Lista grup
│   │   └── [id]/page.tsx            # Szczegóły grupy (forecast, tickety, aktywności)
│   └── api/
│       ├── auth/route.ts            # Logowanie (GET: lista użytkowników, POST: login)
│       ├── admin/users/route.ts     # API zarządzania użytkownikami (admin only)
│       ├── groups/route.ts          # Lista grup
│       ├── groups/[id]/route.ts     # Szczegóły grupy
│       ├── tickets/route.ts         # Tickety + historia
│       ├── tickets/[id]/close/route.ts  # Zamykanie ticketów
│       ├── activities/route.ts      # Logowanie aktywności
│       ├── scoring/route.ts         # Scoring handlowców
│       └── reports/route.ts         # Eksport Excel
├── components/
│   ├── Header.tsx                   # Nawigacja (Dashboard, Grupy, Tickety, Aktywności)
│   ├── GroupCard.tsx                # Karta grupy na liście
│   ├── TicketCard.tsx               # Karta ticketu
│   ├── UtilizationChart.tsx         # Wykres wykorzystania (Recharts)
│   ├── EngagementStats.tsx          # Statystyki zaangażowania
│   ├── RenewalProbabilityCard.tsx   # Prawdopodobieństwo wznowienia
│   ├── ActivityForm.tsx             # Formularz logowania aktywności
│   ├── ActivityList.tsx             # Lista aktywności przy tickecie
│   ├── ScoringCard.tsx              # Karta scoringu handlowca
│   └── ScoringRanking.tsx           # Ranking zespołu
└── lib/
    ├── data.ts                      # Interfejsy (Group, DailyUsage, Salesperson), fetchGroups(), embedded CSV
    ├── users.ts                     # Zarządzanie użytkownikami (Vercel KV + in-memory fallback)
    ├── tickets.ts                   # System ticketów z cyklami życia
    ├── forecast.ts                  # Prognoza wykorzystania + prawdopodobieństwo wznowienia
    ├── activities.ts                # Logowanie aktywności handlowców
    ├── scoring.ts                   # Scoring handlowców (4 wymiary × 25 pkt)
    └── reports.ts                   # Generowanie raportów Excel
```

## 6. System ticketów (kluczowa logika)

### Typy ticketów
- **Activity** (czerwony/pomarańczowy/żółty) - grupa >30 dni, wykorzystanie za niskie
- **Onboarding** (niebieski) - grupa <=30 dni, wykorzystanie <30% oczekiwanego
- **Upsell** (zielony/fioletowy) - dobre wykorzystanie, zbliża się koniec okresu

### Cykl życia
Tickety mogą być wielokrotnie otwierane i zamykane. Każdy cykl open→close jest zapisywany w tablicy `cycles`. Historia przechowywana w `ticketHistoryStore` (Map).

### Histereza
- **Otwarcie:** utilization diff > `activityOpenThreshold` (domyślnie 10pp)
- **Zamknięcie:** utilization diff < `activityCloseThreshold` (domyślnie 3pp)
- **Minimalny bufor:** 5pp między progami (zapobiega oscylacji)

### Dynamiczne progi
Gdy jest >=10 aktywnych grup, progi liczone na podstawie mediany i odchylenia standardowego wykorzystania wszystkich grup. Przy <10 grupach - progi stałe.

### Cooldown
- **Auto-close:** 14 dni cooldownu przed ponownym otwarciem
- **Manual close:** brak cooldownu
- **Panic clause:** >15pp za oczekiwanym wykorzystaniem przerywa cooldown

### Zamykanie
- **Automatyczne:** gdy utilization się poprawi (activity) lub po 30 dniach (onboarding)
- **Manualne:** handlowiec zamyka z powodem (upsell zrealizowany/klient odmówił/ręczne)

## 7. Prawdopodobieństwo wznowienia umowy

Wzór: `40% wykorzystanie + 30% trend + 15% czas + 15% prognoza - kara za tickety`

- **Wykorzystanie (0-40 pkt):** stosunek aktualnego do oczekiwanego
- **Trend (5-30 pkt):** porównanie drugiej połowy ostatnich 30 dni vs pierwszej
- **Czas (5-15 pkt):** ile zostało do końca umowy
- **Prognoza (0-15 pkt):** prognozowane wykorzystanie na koniec
- **Kara za tickety (0-20 pkt):** -3 pkt/cykl activity, -1 pkt/20 dni open, -1 pkt/cykl onboarding

Klasyfikacja: Bardzo wysokie (>=80), Wysokie (>=60), Średnie (>=40), Niskie (>=20), Bardzo niskie (<20)

## 8. Scoring handlowców

4 wymiary × 25 punktów = max 100:

- **Szybkość reakcji (0-25):** czas od otwarcia ticketu do pierwszej aktywności
- **Wskaźnik rozwiązań (0-25):** % zamkniętych ticketów
- **Regularność (0-25):** średnia aktywności/tydzień (>3/tyg = 25 pkt)
- **Sukces upsell (0-25):** % wygranych upselli (brak upselli = 12 pkt neutralne)

## 9. Raporty Excel

Dwa tryby:
- **Pełny raport** (head_of_sales): 4 arkusze - Podsumowanie, Aktywności, Scoring, Tickety
- **Raport osobisty** (salesperson): 3 arkusze - filtrowane dane danego handlowca

## 10. Metryki wykorzystania

- **% całości:** `usedMinutes / totalMinutes` (ile z puli zostało zużyte)
- **% na dziś:** `usedMinutes / expectedMinutesToday` (czy są na bieżąco)
- **Target:** 75% wykorzystania do końca okresu (nie 100%, bo to bufor)

## 11. Historia wersji (tagi Git)

| Tag | Data | Opis |
|-----|------|------|
| v2026-03-30 | 2026-03-30 | Bazowa wersja: dashboard, grupy, tickety, forecast, wykres |
| v2026-04-02 | 2026-04-02 | System aktywności: logowanie, auto-zamykanie, scoring, eksport Excel |
| v2026-04-02-review | 2026-04-02 | Code review fixes: mediana, typy, division by zero, wydajność chart |
| v2026-04-07 | 2026-04-07 | Aktualizacja danych talksession (7316 sesji), panel admin użytkowników, Vercel KV, dropdown login, workflow branchowania |

## 12. Znane ograniczenia i plany

### Do naprawy
- [ ] Google Sheets CSV zwraca 401 - dane embedded jako fallback
- [ ] Dane runtime (aktywności, tickety, scoring) in-memory resetują się przy redeploy
- [ ] Token Base64 bez podpisu kryptograficznego
- [ ] Brak walidacji uprawnień przy zamykaniu ticketów (każdy zalogowany może zamknąć dowolny)

### Zrealizowane
- [x] System branching (feature branches + preview URL na Vercel) - zrealizowane 2026-04-07
- [x] Vercel KV dla danych użytkowników (trwały zapis) - zrealizowane 2026-04-07
- [x] Panel administracyjny z zarządzaniem użytkownikami - zrealizowane 2026-04-07
- [x] Dropdown login zamiast ręcznego wpisywania imienia - zrealizowane 2026-04-07

### Planowane
- [ ] Baza danych (Vercel Postgres lub Supabase) dla danych runtime (aktywności, tickety, scoring)
- [ ] Integracja z HubSpot do weryfikacji upselli
- [ ] Realne śledzenie aktywności (nie tylko manualne logowanie)
- [ ] Internacjonalizacja (polskie stringi w jednym pliku i18n)
- [ ] Migracja z @vercel/kv na @upstash/redis (rekomendacja Vercel)

## 13. Wskazówki dla Claude na nowej sesji

1. **Najpierw przeczytaj ten plik** - zawiera pełny kontekst projektu
2. **Konrad nie jest programistą** - dawaj proste instrukcje krok po kroku, unikaj `&&` w PowerShell
3. **Przed pushem zawsze rób code review** - Konrad o to dba i to docenia
4. **Taguj wersje** po ważnych zmianach (format: `v{data}` lub `v{data}-{opis}`)
5. **Kopiuj pliki do folderu użytkownika** po zmianach: `/sessions/.../mnt/Farmer B2B/`
6. **Build musi przejść** przed każdym commitem
7. **Aktualizuj ten plik** na koniec każdej sesji z nowymi zmianami
