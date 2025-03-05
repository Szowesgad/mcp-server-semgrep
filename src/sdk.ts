/**
 * MCP Protocol Bridge
 * 
 * Ten plik służy jako warstwa kompatybilności między kodem projektu
 * a oficjalnym SDK MCP. Wcześniej używaliśmy własnej implementacji,
 * ale powróciliśmy do oficjalnego SDK dla lepszej zgodności z protokołem.
 * 
 * Zalety:
 * - Pełna kompatybilność z protokołem MCP
 * - Łatwiejsza obsługa powiadomień i błędów
 * - Standardowy sposób obsługi zapytań i odpowiedzi
 * - Lepsze wsparcie dla przyszłych wersji protokołu
 */

// Eksportujemy komponenty z oficjalnego SDK
export { Server } from '@modelcontextprotocol/sdk/server';
export { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
export {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/shared';
