/**
 * Request routing module
 * Routes agent requests to appropriate sub-agents
 */

import type {
  SubAgent,
  AgentRequest,
  AgentResponse,
} from "../types/index.ts";

/**
 * Find an agent by ID
 */
export function findAgentById(
  agents: SubAgent[],
  agentId: string,
): SubAgent | null {
  return agents.find((agent) => agent.id === agentId) || null;
}

/**
 * Route a request to the appropriate agent
 */
export function routeRequest(
  request: AgentRequest,
  agents: SubAgent[],
): SubAgent | null {
  return findAgentById(agents, request.agentId);
}

/**
 * Validate an agent request
 */
export function validateRequest(request: AgentRequest): boolean {
  // Check required fields
  if (!request.requestId || typeof request.requestId !== "string") {
    return false;
  }

  if (!request.agentId || typeof request.agentId !== "string") {
    return false;
  }

  if (!request.prompt || typeof request.prompt !== "string" || request.prompt.trim() === "") {
    return false;
  }

  return true;
}

/**
 * Create a success response
 */
export function createSuccessResponse(
  request: AgentRequest,
  agent: SubAgent,
  result: string,
  toolsUsed?: string[],
): AgentResponse {
  return {
    requestId: request.requestId,
    agentId: agent.id,
    result,
    toolsUsed,
    timestamp: new Date(),
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(
  request: AgentRequest,
  error: string,
): AgentResponse {
  return {
    requestId: request.requestId,
    agentId: request.agentId,
    timestamp: new Date(),
    error,
  };
}
