/**
 * Cross-cutting types shared between client and server.
 * Keep this module dependency-free.
 */

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  service: string;
  version: string;
  timestamp: string;
  hasMeshyKey: boolean;
  hasAnthropicKey: boolean;
  npcModel: string;
}
