---
name: farmer-b2b
description: >
  Kontekst i instrukcje projektu Farmer B2B - wewnetrznej aplikacji webowej zespolu sprzedazy B2B w Tutlo.
  ZAWSZE uzyj tego skilla gdy uzytkownik wspomina o: Farmer B2B, farmer, dashboard handlowcow, tickety sprzedazowe,
  wykorzystanie minut, grupy kursantow, scoring handlowcow, prawdopodobienstwo wznowienia, upsell,
  onboarding grup, forecast wykorzystania, raporty Excel dla handlowcow, lub jakiejkolwiek pracy nad
  repozytorium farmer-b2b / kfratczak-spec/farmer-b2b. Uzywaj takze gdy uzytkownik pyta o stan projektu,
  architekture, lub chce kontynuowac prace nad aplikacja. Ten skill jest niezbedny na poczatku kazdej sesji
  dotyczacej tego projektu - bez niego stracisz caly kontekst historyczny.
---

# Farmer B2B - Skill kontekstowy

## Co robic na poczatku sesji

Zanim cokolwiek zrobisz, przeczytaj plik kontekstu projektu:

```
Read: /sessions/.../mnt/Farmer B2B/KONTEKST_PROJEKTU.md
```

Ten plik zawiera pelna dokumentacje projektu: architekture, decyzje techniczne, stan systemu, znane ograniczenia i plany. Bez niego bedziesz musial odtwarzac kontekst od zera, co jest strata czasu i prowadzi do bledow.

## Co robic na koncu sesji

Przed zakonczeniem pracy nad projektem:

1. **Zaktualizuj KONTEKST_PROJEKTU.md** o nowe zmiany:
   - Dodaj nowe tagi do historii wersji
   - Zaktualizuj sekcje "Znane ograniczenia i plany" (odznacz zrealizowane, dodaj nowe)
   - Dodaj nowe pliki do struktury jesli powstaly
   - Zaktualizuj date "Ostatnia aktualizacja" na gorze pliku
   - Opisz kluczowe decyzje architektoniczne podjete w tej sesji

2. **Skopiuj zaktualizowany plik** do folderu uzytkownika

3. **Zaproponuj push** zaktualizowanego kontekstu do repozytorium

## Zasady pracy z Konradem

- Konrad jest Head of CRM & Marketing Automation, nie programista - dawaj proste instrukcje krok po kroku
- Uzywa PowerShell na Windows - nie laczyc komend przez `&&`, uzywac `;` lub osobne komendy
- Przed pushem zawsze rob code review - Konrad o to dba
- Taguj wazne wersje (format: `v{RRRR-MM-DD}` lub `v{RRRR-MM-DD}-{opis}`)
- Build musi przejsc przed kazdym commitem
- Zawsze kopiuj zmienione pliki do folderu uzytkownika (`/sessions/.../mnt/Farmer B2B/`)

## Stack technologiczny (skrot)

- Next.js (App Router) + TypeScript + Tailwind CSS
- Vercel (auto-deploy z GitHub push na main)
- Recharts (wykresy), xlsx (raporty Excel)
- In-memory storage (brak bazy danych - znane ograniczenie)
- Dane z Google Sheets (aktualnie fallback na embedded data)

Pelne szczegoly sa w KONTEKST_PROJEKTU.md - przeczytaj go na poczatku sesji.
