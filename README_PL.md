# MCP Server Semgrep

![MCP Server Semgrep Logo](./logo.svg)

## O projekcie

Ten projekt został początkowo zainspirowany przez The Replit Team i Agenta V2, a także implementację [stefanskiasan/mcp-server-semgrep](https://github.com/stefanskiasan/mcp-server-semgrep), ale ewoluował w stronę bardziej solidnej architektury, zawierającej własną implementację protokołu MCP dla zwiększenia stabilności i łatwiejszej konserwacji.

MCP Server Semgrep to serwer zgodny z protokołem Model Context Protocol (MCP), który integruje potężne narzędzie analizy statycznej Semgrep z asystentami AI, takimi jak Anthropic Claude. Umożliwia przeprowadzanie zaawansowanych analiz kodu, wykrywanie błędów bezpieczeństwa oraz poprawę jakości kodu bezpośrednio w interfejsie konwersacyjnym.

## Korzyści z integracji

### Dla programistów i zespołów deweloperskich:

- **Holistyczna analiza kodu źródłowego** - wykrywanie problemów w całym projekcie, a nie tylko pojedynczych plikach
- **Proaktywne wykrywanie błędów** - identyfikacja potencjalnych problemów, zanim staną się krytycznymi błędami
- **Stała poprawa jakości kodu** - regularne skanowanie i refaktoryzacja prowadzą do stopniowej poprawy bazy kodu
- **Spójność stylistyczna** - identyfikacja i naprawa niespójności w kodzie, takich jak:
  - Przypadkowe warstwy z-index w CSS
  - Niekonsekwentne nazewnictwo
  - Duplikacje kodu
  - "Magic numbers" zamiast nazwanych stałych

### Dla bezpieczeństwa:

- **Automatyczna weryfikacja kodu pod kątem znanych luk** - skanowanie w poszukiwaniu znanych wzorców problemów bezpieczeństwa
- **Dostosowane reguły bezpieczeństwa** - tworzenie reguł specyficznych dla projektu
- **Edukacja zespołu** - uczenie bezpiecznych praktyk programowania poprzez wykrywanie potencjalnych problemów

### Dla utrzymania i rozwoju projektów:

- **Dokumentacja "na żywo"** - AI może wyjaśnić, dlaczego dany fragment kodu jest problematyczny i jak go poprawić
- **Redukcja długu technicznego** - systematyczne wykrywanie i naprawianie problematycznych obszarów
- **Usprawnienie code review** - automatyczne wykrywanie typowych problemów pozwala skupić się na bardziej złożonych kwestiach

## Kluczowe cechy

- Niestandardowa implementacja MCP upraszczająca bazę kodu
- Zmniejszona liczba zależności zewnętrznych dla lepszej konserwacji długoterminowej
- Usprawniony protokół komunikacji skoncentrowany na przypadkach użycia Semgrep
- Zreorganizowana struktura projektu i modularyzacja
- Ulepszona obsługa błędów i bezpieczeństwo
- Interfejs i dokumentacja w językach polskim i angielskim
- Kompleksowe testy jednostkowe
- Rozbudowana dokumentacja

## Funkcje

Semgrep MCP Server zapewnia następujące narzędzia:

- **scan_directory**: Skanowanie kodu źródłowego pod kątem potencjalnych problemów
- **list_rules**: Wyświetlanie dostępnych reguł i języków obsługiwanych przez Semgrep
- **analyze_results**: Szczegółowa analiza wyników skanowania
- **create_rule**: Tworzenie niestandardowych reguł Semgrep
- **filter_results**: Filtrowanie wyników według różnych kryteriów
- **export_results**: Eksportowanie wyników w różnych formatach
- **compare_results**: Porównywanie dwóch zestawów wyników (np. przed i po zmianach)

## Typowe przypadki użycia

- Analiza bezpieczeństwa kodu przed wdrożeniem
- Wykrywanie typowych błędów programistycznych
- Egzekwowanie standardów kodowania w zespole
- Refaktoryzacja i poprawa jakości istniejącego kodu
- Identyfikacja niespójności w stylach i strukturze kodu (np. CSS, organizacja komponentów)
- Edukacja programistów w zakresie dobrych praktyk
- Weryfikacja poprawności napraw (porównywanie skanów przed/po)

## Instalacja

### Wymagania wstępne

- Node.js v16+
- Semgrep CLI zainstalowany globalnie lub lokalnie
- TypeScript (dla rozwoju)

### Konfiguracja

1. Sklonuj repozytorium:
```bash
git clone https://github.com/Szowesgad/mcp-server-semgrep.git
cd mcp-server-semgrep
```

2. Zainstaluj zależności:
```bash
npm install
# lub
yarn install
# lub
pnpm install
```

3. Zbuduj projekt:
```bash
npm run build
# lub
yarn build
# lub
pnpm run build
```

## Integracja z Claude Desktop

Aby zintegrować MCP Server Semgrep z Claude Desktop:

1. Zainstaluj Claude Desktop
2. Zaktualizuj plik konfiguracyjny Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "semgrep": {
      "command": "node",
      "args": [
        "/ścieżka/do/projektu/mcp-server-semgrep/build/index.js"
      ]
    }
  }
}
```

3. Uruchom Claude Desktop i zacznij zadawać pytania dotyczące analizy kodu!

## Przykłady użycia

### Skanowanie projektu

```
Mógłbyś przeskanować mój kod źródłowy w katalogu /projekty/moja-aplikacja pod kątem potencjalnych problemów bezpieczeństwa?
```

### Analiza spójności stylu

```
Przeanalizuj wartości z-index w plikach CSS projektu i zidentyfikuj niespójności oraz potencjalne konflikty warstw.
```

### Tworzenie niestandardowej reguły

```
Stwórz regułę Semgrep, która wykrywa nieprawidłowe użycie funkcji sanitizujących dane wejściowe.
```

### Filtrowanie wyników

```
Pokaż mi tylko wyniki skanowania dotyczące podatności na wstrzykiwanie SQL.
```

### Identyfikacja problematycznych wzorców

```
Znajdź w kodzie wszystkie "magic numbers" i zaproponuj zastąpienie ich nazwanymi stałymi.
```

## Tworzenie własnych reguł

Możesz tworzyć własne reguły dla specyficznych potrzeb Twojego projektu. Oto przykłady reguł, które możesz stworzyć:

### Reguła wykrywająca niespójne z-indeksy:

```yaml
rules:
  - id: inconsistent-z-index
    pattern: z-index: $Z
    message: "Z-index $Z może nie być zgodny z systemem warstwowym projektu"
    languages: [css, scss]
    severity: WARNING
```

### Reguła wykrywająca nieprawidłowe importy:

```yaml
rules:
  - id: deprecated-import
    pattern: import $X from 'stara-biblioteka'
    message: "Używasz przestarzałej biblioteki. Rozważ użycie 'nowa-biblioteka'"
    languages: [javascript, typescript]
    severity: WARNING
```

## Rozwój

### Testy

```bash
npm test
# lub
yarn test
# lub
pnpm test
```

### Struktura projektu

```
src/
  ├── config.ts         # Konfiguracja serwera
  ├── index.ts          # Punkt wejścia
  ├── sdk.ts            # Most dla protokołu MCP
  ├── mcp/              # Własna implementacja MCP
  ├── handlers/         # Procedury obsługi zapytań
  ├── utils/            # Funkcje narzędziowe
  └── types/            # Definicje typów TypeScript
```

## Dalsza dokumentacja

Szczegółowe informacje dotyczące używania narzędzia znajdziesz w:
- [USAGE.md](USAGE.md) - Szczegółowa instrukcja użytkowania
- [README_EN.md](README_EN.md) - Dokumentacja w języku angielskim
- [examples/](examples/) - Przykładowe zabawne i praktyczne reguły Semgrep - "Galeria Horrorów Kodu"

## Licencja

Ten projekt jest licencjonowany na warunkach licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## Podziękowania

- [stefanskiasan](https://github.com/stefanskiasan) za oryginalną inspirację
- [Anthropic](https://www.anthropic.com/) za Claude i protokół MCP
- [Semgrep](https://semgrep.dev/) za ich świetne narzędzie do analizy statycznej
