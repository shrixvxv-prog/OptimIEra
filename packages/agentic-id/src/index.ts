export type AgentResponse = {
  state: 'unconfigured' | 'unavailable' | 'ready';
  agentId?: string;
  reason?: string;
};
export interface AgentIdentityAdapter {
  healthCheck(): Promise<AgentResponse>;
  getAgent(agentId: string): Promise<AgentResponse>;
  verifyOwnership(agentId: string, owner: string): Promise<AgentResponse>;
  bindCertificate(agentId: string, certificateId: string): Promise<AgentResponse>;
}
