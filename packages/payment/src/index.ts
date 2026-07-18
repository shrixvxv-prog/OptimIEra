export type PaymentResponse = {
  state: 'unconfigured' | 'unavailable' | 'ready';
  requestId?: string;
  receiptId?: string;
  reason?: string;
};
export interface PaymentAdapter {
  healthCheck(): Promise<PaymentResponse>;
  quote(request: { operation: string; units: number }): Promise<PaymentResponse>;
  createPaymentRequest(request: { operation: string; units: number }): Promise<PaymentResponse>;
  verifyPayment(requestId: string): Promise<PaymentResponse>;
  getReceipt(receiptId: string): Promise<PaymentResponse>;
}
export const paymentIntegration = {
  status: 'PLANNED' as const,
  note: 'No 0G-specific payment SDK or endpoint is claimed in Phase 0.',
};
