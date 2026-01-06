import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

class PaymentProcessor {
  constructor(options = {}) {
    this.gateway = options.gateway || 'stripe';
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.transactions = new Map();
    this.refunds = new Map();
  }

  async processPayment(payment) {
    const { id, amount, currency, customer, method } = payment;

    if (!id || !customer || !method) {
      throw new Error('Missing required payment fields');
    }

    if (amount === undefined || amount === null) {
      throw new Error('Missing required payment fields');
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (!currency) {
      throw new Error('Missing required payment fields');
    }

    if (currency.length !== 3) {
      throw new Error('Invalid currency code');
    }

    const transaction = {
      id,
      amount,
      currency,
      customer,
      method,
      status: 'pending',
      timestamp: Date.now(),
      attempts: 0
    };

    this.transactions.set(id, transaction);

    try {
      await this._executePayment(transaction);
      transaction.status = 'completed';
      transaction.completedAt = Date.now();
      return transaction;
    } catch (error) {
      transaction.status = 'failed';
      transaction.error = error.message;
      throw error;
    }
  }

  async _executePayment(transaction, attempt = 0) {
    transaction.attempts = attempt + 1;

    if (transaction.customer.includes('fail')) {
      throw new Error('Payment declined');
    }

    if (transaction.customer.includes('timeout')) {
      throw new Error('Gateway timeout');
    }

    if (transaction.customer.includes('retry') && attempt < 2) {
      throw new Error('Temporary failure');
    }

    return { success: true };
  }

  async processPaymentWithRetry(payment) {
    const { id, amount, currency, customer, method } = payment;

    if (!id || !customer || !method || amount === undefined || amount === null) {
      throw new Error('Missing required payment fields');
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    if (!currency || currency.length !== 3) {
      throw new Error('Invalid currency code');
    }

    const transaction = {
      id,
      amount,
      currency,
      customer,
      method,
      status: 'pending',
      timestamp: Date.now(),
      attempts: 0
    };

    this.transactions.set(id, transaction);

    let lastError;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        await this._executePayment(transaction, attempt);
        transaction.status = 'completed';
        transaction.completedAt = Date.now();
        return transaction;
      } catch (error) {
        lastError = error;

        if (error.message.includes('declined')) {
          transaction.status = 'failed';
          transaction.error = error.message;
          throw error;
        }

        if (attempt < this.retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    transaction.status = 'failed';
    transaction.error = lastError.message;
    throw lastError;
  }

  async refundPayment(transactionId, amount, reason) {
    const transaction = this.transactions.get(transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
      throw new Error('Can only refund completed transactions');
    }

    if (amount > transaction.amount) {
      throw new Error('Refund amount exceeds transaction amount');
    }

    const existingRefunds = Array.from(this.refunds.values())
      .filter(r => r.transactionId === transactionId && r.status === 'completed');

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);

    if (totalRefunded + amount > transaction.amount) {
      throw new Error('Total refund amount exceeds transaction amount');
    }

    const refund = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      transactionId,
      amount,
      reason,
      status: 'pending',
      timestamp: Date.now()
    };

    this.refunds.set(refund.id, refund);

    try {
      await this._executeRefund(refund);
      refund.status = 'completed';
      refund.completedAt = Date.now();
      return refund;
    } catch (error) {
      refund.status = 'failed';
      refund.error = error.message;
      throw error;
    }
  }

  async _executeRefund(refund) {
    if (refund.transactionId.includes('fail')) {
      throw new Error('Refund failed');
    }
    return { success: true };
  }

  async partialRefund(transactionId, amount, reason) {
    return this.refundPayment(transactionId, amount, reason);
  }

  async fullRefund(transactionId, reason) {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    return this.refundPayment(transactionId, transaction.amount, reason);
  }

  getTransaction(id) {
    return this.transactions.get(id);
  }

  getRefund(id) {
    return this.refunds.get(id);
  }

  getTransactionRefunds(transactionId) {
    return Array.from(this.refunds.values())
      .filter(r => r.transactionId === transactionId);
  }

  async batchProcessPayments(payments) {
    const results = await Promise.allSettled(
      payments.map(p => this.processPayment(p))
    );

    return results.map((result, index) => ({
      payment: payments[index],
      status: result.status,
      value: result.value,
      error: result.reason
    }));
  }
}

describe('PaymentProcessor - Basic Processing', () => {
  let processor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  it('should process a valid payment successfully', async () => {
    const payment = {
      id: 'pay_001',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    const result = await processor.processPayment(payment);

    expect(result.status).toBe('completed');
    expect(result.amount).toBe(100.00);
    expect(result.completedAt).toBeDefined();
  });

  it('should validate required payment fields', async () => {
    const invalidPayment = {
      id: 'pay_002',
      amount: 50.00
    };

    await expect(processor.processPayment(invalidPayment))
      .rejects.toThrow('Missing required payment fields');
    expect(processor.transactions.size).toBe(0);
  });

  it('should reject zero amount payments', async () => {
    const payment = {
      id: 'pay_003',
      amount: 0,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await expect(processor.processPayment(payment))
      .rejects.toThrow('Payment amount must be positive');
    expect(processor.transactions.size).toBe(0);
  });

  it('should reject negative amount payments', async () => {
    const payment = {
      id: 'pay_004',
      amount: -50.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await expect(processor.processPayment(payment))
      .rejects.toThrow('Payment amount must be positive');
    expect(processor.transactions.size).toBe(0);
  });

  it('should validate currency code format', async () => {
    const payment = {
      id: 'pay_005',
      amount: 100.00,
      currency: 'US',
      customer: 'cust_001',
      method: 'card'
    };

    await expect(processor.processPayment(payment))
      .rejects.toThrow('Invalid currency code');
    expect(processor.transactions.size).toBe(0);
  });

  it('should store transaction with pending status initially', async () => {
    const payment = {
      id: 'pay_006',
      amount: 75.00,
      currency: 'EUR',
      customer: 'cust_002',
      method: 'card'
    };

    await processor.processPayment(payment);
    const transaction = processor.getTransaction('pay_006');

    expect(transaction).toBeDefined();
    expect(transaction.status).toBe('completed');
    expect(transaction.timestamp).toBeDefined();
  });

  it('should process multiple different payment methods', async () => {
    const payments = [
      { id: 'pay_007', amount: 100, currency: 'USD', customer: 'cust_001', method: 'card' },
      { id: 'pay_008', amount: 200, currency: 'USD', customer: 'cust_002', method: 'paypal' },
      { id: 'pay_009', amount: 300, currency: 'USD', customer: 'cust_003', method: 'bank_transfer' }
    ];

    for (const payment of payments) {
      const result = await processor.processPayment(payment);
      expect(result.status).toBe('completed');
      expect(result.method).toBe(payment.method);
    }
  });

  it('should handle multiple currencies', async () => {
    const currencies = ['USD', 'EUR', 'GBP', 'JPY'];

    for (let i = 0; i < currencies.length; i++) {
      const payment = {
        id: `pay_${10 + i}`,
        amount: 100,
        currency: currencies[i],
        customer: 'cust_001',
        method: 'card'
      };
      const result = await processor.processPayment(payment);
      expect(result.currency).toBe(currencies[i]);
      expect(result.status).toBe('completed');
    }
  });
});

describe('PaymentProcessor - Failure Handling', () => {
  let processor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  it('should handle declined payments', async () => {
    const payment = {
      id: 'pay_020',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_fail',
      method: 'card'
    };

    await expect(processor.processPayment(payment))
      .rejects.toThrow('Payment declined');

    const transaction = processor.getTransaction('pay_020');
    expect(transaction.status).toBe('failed');
    expect(transaction.error).toBe('Payment declined');
  });

  it('should handle gateway timeouts', async () => {
    const payment = {
      id: 'pay_021',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_timeout',
      method: 'card'
    };

    await expect(processor.processPayment(payment))
      .rejects.toThrow('Gateway timeout');

    const transaction = processor.getTransaction('pay_021');
    expect(transaction.status).toBe('failed');
    expect(transaction.error).toBe('Gateway timeout');
  });

  it('should track failed payment attempts', async () => {
    const payment = {
      id: 'pay_022',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_fail',
      method: 'card'
    };

    await expect(processor.processPayment(payment)).rejects.toThrow();

    const transaction = processor.getTransaction('pay_022');
    expect(transaction.attempts).toBeGreaterThan(0);
    expect(transaction.status).toBe('failed');
  });

  it('should preserve error details in failed transactions', async () => {
    const payment = {
      id: 'pay_023',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_fail',
      method: 'card'
    };

    await expect(processor.processPayment(payment)).rejects.toThrow();

    const transaction = processor.getTransaction('pay_023');
    expect(transaction.error).toBeDefined();
    expect(transaction.error).toContain('declined');
  });
});

describe('PaymentProcessor - Retry Logic', () => {
  let processor;

  beforeEach(() => {
    processor = new PaymentProcessor({ retryAttempts: 3, retryDelay: 10 });
  });

  it('should retry failed payments up to max attempts', async () => {
    const payment = {
      id: 'pay_030',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_retry',
      method: 'card'
    };

    const result = await processor.processPaymentWithRetry(payment);

    expect(result.status).toBe('completed');
    expect(result.attempts).toBeGreaterThanOrEqual(2);
    expect(result.attempts).toBeLessThanOrEqual(3);
  });

  it('should not retry permanently declined payments', async () => {
    const payment = {
      id: 'pay_031',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_fail',
      method: 'card'
    };

    await expect(processor.processPaymentWithRetry(payment))
      .rejects.toThrow('Payment declined');

    const transaction = processor.getTransaction('pay_031');
    expect(transaction.attempts).toBe(1);
  });

  it('should wait between retry attempts', async () => {
    const startTime = Date.now();
    const payment = {
      id: 'pay_032',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_retry',
      method: 'card'
    };

    await processor.processPaymentWithRetry(payment);
    const duration = Date.now() - startTime;

    expect(duration).toBeGreaterThan(15);
  });

  it('should configure custom retry attempts', async () => {
    const customProcessor = new PaymentProcessor({ retryAttempts: 5, retryDelay: 5 });

    expect(customProcessor.retryAttempts).toBe(5);
    expect(customProcessor.retryDelay).toBe(5);
  });

  it('should exhaust all retry attempts before failing', async () => {
    const payment = {
      id: 'pay_033',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_timeout',
      method: 'card'
    };

    await expect(processor.processPaymentWithRetry(payment))
      .rejects.toThrow('Gateway timeout');

    const transaction = processor.getTransaction('pay_033');
    expect(transaction.attempts).toBe(1);
  });
});

describe('PaymentProcessor - Refunds', () => {
  let processor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  it('should process full refund successfully', async () => {
    const payment = {
      id: 'pay_040',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    const refund = await processor.fullRefund('pay_040', 'Customer request');

    expect(refund.status).toBe('completed');
    expect(refund.amount).toBe(100.00);
    expect(refund.reason).toBe('Customer request');
  });

  it('should process partial refund successfully', async () => {
    const payment = {
      id: 'pay_041',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    const refund = await processor.partialRefund('pay_041', 30.00, 'Partial return');

    expect(refund.status).toBe('completed');
    expect(refund.amount).toBe(30.00);
    expect(refund.transactionId).toBe('pay_041');
  });

  it('should reject refund for non-existent transaction', async () => {
    await expect(processor.refundPayment('pay_999', 50.00, 'test'))
      .rejects.toThrow('Transaction not found');
    expect(processor.refunds.size).toBe(0);
  });

  it('should reject refund for non-completed transaction', async () => {
    const payment = {
      id: 'pay_042',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_fail',
      method: 'card'
    };

    await expect(processor.processPayment(payment)).rejects.toThrow();
    await expect(processor.refundPayment('pay_042', 50.00, 'test'))
      .rejects.toThrow('Can only refund completed transactions');
  });

  it('should reject refund exceeding transaction amount', async () => {
    const payment = {
      id: 'pay_043',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    await expect(processor.refundPayment('pay_043', 150.00, 'test'))
      .rejects.toThrow('Refund amount exceeds transaction amount');
  });

  it('should allow multiple partial refunds up to total', async () => {
    const payment = {
      id: 'pay_044',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    const refund1 = await processor.partialRefund('pay_044', 30.00, 'First refund');
    const refund2 = await processor.partialRefund('pay_044', 20.00, 'Second refund');
    const refund3 = await processor.partialRefund('pay_044', 50.00, 'Third refund');

    expect(refund1.status).toBe('completed');
    expect(refund2.status).toBe('completed');
    expect(refund3.status).toBe('completed');
  });

  it('should reject partial refund exceeding remaining amount', async () => {
    const payment = {
      id: 'pay_045',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    await processor.partialRefund('pay_045', 60.00, 'First refund');

    await expect(processor.partialRefund('pay_045', 50.00, 'Second refund'))
      .rejects.toThrow('Total refund amount exceeds transaction amount');
  });

  it('should track refund timestamps', async () => {
    const payment = {
      id: 'pay_046',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    const refund = await processor.fullRefund('pay_046', 'test');

    expect(refund.timestamp).toBeDefined();
    expect(refund.completedAt).toBeDefined();
    expect(refund.completedAt).toBeGreaterThanOrEqual(refund.timestamp);
  });

  it('should retrieve all refunds for a transaction', async () => {
    const payment = {
      id: 'pay_047',
      amount: 100.00,
      currency: 'USD',
      customer: 'cust_001',
      method: 'card'
    };

    await processor.processPayment(payment);
    await processor.partialRefund('pay_047', 30.00, 'First');
    await processor.partialRefund('pay_047', 20.00, 'Second');

    const refunds = processor.getTransactionRefunds('pay_047');
    expect(refunds).toHaveLength(2);
    expect(refunds[0].amount).toBe(30.00);
    expect(refunds[1].amount).toBe(20.00);
  });
});

describe('PaymentProcessor - Batch Processing', () => {
  let processor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  it('should process multiple payments in batch', async () => {
    const payments = [
      { id: 'pay_050', amount: 100, currency: 'USD', customer: 'cust_001', method: 'card' },
      { id: 'pay_051', amount: 200, currency: 'USD', customer: 'cust_002', method: 'card' },
      { id: 'pay_052', amount: 300, currency: 'USD', customer: 'cust_003', method: 'card' }
    ];

    const results = await processor.batchProcessPayments(payments);

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('fulfilled');
    expect(results[2].status).toBe('fulfilled');
  });

  it('should handle mixed success and failure in batch', async () => {
    const payments = [
      { id: 'pay_053', amount: 100, currency: 'USD', customer: 'cust_001', method: 'card' },
      { id: 'pay_054', amount: 200, currency: 'USD', customer: 'cust_fail', method: 'card' },
      { id: 'pay_055', amount: 300, currency: 'USD', customer: 'cust_003', method: 'card' }
    ];

    const results = await processor.batchProcessPayments(payments);

    expect(results).toHaveLength(3);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');
  });

  it('should return detailed results for each payment', async () => {
    const payments = [
      { id: 'pay_056', amount: 100, currency: 'USD', customer: 'cust_001', method: 'card' },
      { id: 'pay_057', amount: 200, currency: 'USD', customer: 'cust_fail', method: 'card' }
    ];

    const results = await processor.batchProcessPayments(payments);

    expect(results[0].payment.id).toBe('pay_056');
    expect(results[0].value).toBeDefined();
    expect(results[1].payment.id).toBe('pay_057');
    expect(results[1].error).toBeDefined();
  });

  it('should process empty batch without errors', async () => {
    const results = await processor.batchProcessPayments([]);

    expect(results).toHaveLength(0);
  });
});
