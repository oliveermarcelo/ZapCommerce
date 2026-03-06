/**
 * Backward compatibility wrapper
 * Redireciona para o módulo payment/ modularizado
 */
export { generatePixForOrder, processPaymentWebhook, generateMonthlyInvoice } from './payment/factory'
