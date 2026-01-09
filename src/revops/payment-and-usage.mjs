import { consola } from 'consola';
import { useGitVan } from '../core/context.mjs';

// Payment and Usage Integration States
export const PAYMENT_STATES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  PENDING: 'pending',
  REFUNDED: 'refunded'
};

export const USAGE_EVENTS = {
  API_CALL: 'api_call',
  STORAGE: 'storage',
  COMPUTE: 'compute',
  BANDWIDTH: 'bandwidth'
};

export const RETENTION_ACTIONS = {
  EMAIL: 'email',
  DISCOUNT: 'discount',
  OUTREACH: 'outreach',
  SURVEY: 'survey'
};

/**
 * Payment Webhook Handler
 * Processes payment events and updates subscriptions
 */
export class PaymentWebhookHandler {
  constructor(storage, metricsEngine) {
    this.storage = storage;
    this.metricsEngine = metricsEngine;
    this.handlers = new Map();
    this._setupHandlers();
  }

  _setupHandlers() {
    this.handlers.set(PAYMENT_STATES.SUCCESS, this._handlePaymentSuccess.bind(this));
    this.handlers.set(PAYMENT_STATES.FAILED, this._handlePaymentFailure.bind(this));
    this.handlers.set(PAYMENT_STATES.REFUNDED, this._handlePaymentRefund.bind(this));
  }

  async handleWebhook(event) {
    const startTime = Date.now();
    const { type, data } = event;

    try {
      consola.info(`Processing payment webhook: ${type}`);

      const handler = this.handlers.get(type);
      if (!handler) {
        consola.warn(`Unknown webhook type: ${type}`);
        return { success: false, error: 'unknown_type' };
      }

      const result = await handler(data);

      await this._logWebhook({
        type,
        customerId: data.customerId,
        status: 'success',
        duration: Date.now() - startTime,
        result
      });

      consola.success(`Webhook processed: ${type}`);
      return { success: true, result };

    } catch (error) {
      consola.error(`Webhook processing failed: ${error.message}`);

      await this._logWebhook({
        type,
        customerId: data?.customerId,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      });

      return { success: false, error: error.message };
    }
  }

  async _handlePaymentSuccess(data) {
    const { customerId, amount, subscriptionId, paymentId } = data;

    await this.storage.updateSubscription(customerId, {
      status: 'active',
      lastPaymentDate: new Date().toISOString(),
      lastPaymentAmount: amount,
      consecutiveFailures: 0
    });

    await this.metricsEngine.recordRevenue({
      customerId,
      amount,
      type: 'subscription',
      subscriptionId,
      paymentId,
      date: new Date().toISOString()
    });

    return { action: 'subscription_updated', customerId };
  }

  async _handlePaymentFailure(data) {
    const { customerId, reason, subscriptionId, attemptCount } = data;

    const subscription = await this.storage.getSubscription(customerId);
    const consecutiveFailures = (subscription?.consecutiveFailures || 0) + 1;

    await this.storage.updateSubscription(customerId, {
      status: consecutiveFailures >= 3 ? 'suspended' : 'payment_failed',
      lastFailureDate: new Date().toISOString(),
      lastFailureReason: reason,
      consecutiveFailures
    });

    if (consecutiveFailures >= 3) {
      await this._triggerRetentionAction({
        customerId,
        action: RETENTION_ACTIONS.EMAIL,
        reason: 'payment_failure',
        urgency: 'high'
      });
    }

    return {
      action: 'failure_recorded',
      customerId,
      consecutiveFailures,
      suspended: consecutiveFailures >= 3
    };
  }

  async _handlePaymentRefund(data) {
    const { customerId, amount, paymentId, reason } = data;

    await this.metricsEngine.recordRevenue({
      customerId,
      amount: -amount,
      type: 'refund',
      paymentId,
      reason,
      date: new Date().toISOString()
    });

    await this._triggerRetentionAction({
      customerId,
      action: RETENTION_ACTIONS.SURVEY,
      reason: 'refund',
      urgency: 'medium'
    });

    return { action: 'refund_processed', customerId, amount };
  }

  async _triggerRetentionAction(action) {
    await this.storage.queueRetentionAction(action);
  }

  async _logWebhook(logEntry) {
    await this.storage.appendLog('webhooks', logEntry);
  }
}

/**
 * Usage Tracking Integration
 * Tracks usage events and calculates charges
 */
export class UsageTrackingIntegration {
  constructor(storage, metricsEngine) {
    this.storage = storage;
    this.metricsEngine = metricsEngine;
    this.pricingTiers = new Map();
    this.alertThresholds = new Map();
  }

  setPricingTier(eventType, tiers) {
    this.pricingTiers.set(eventType, tiers);
  }

  setAlertThreshold(customerId, eventType, threshold) {
    const key = `${customerId}:${eventType}`;
    this.alertThresholds.set(key, threshold);
  }

  async trackUsage(event) {
    const { customerId, eventType, quantity, metadata } = event;

    try {
      const usage = await this.storage.incrementUsage(customerId, eventType, quantity);

      await this._checkOverage(customerId, eventType, usage);
      await this._checkAlerts(customerId, eventType, usage);

      await this.storage.appendLog('usage', {
        customerId,
        eventType,
        quantity,
        total: usage.total,
        timestamp: new Date().toISOString(),
        metadata
      });

      return { success: true, usage: usage.total };

    } catch (error) {
      consola.error(`Usage tracking failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async calculateUsageCharges(customerId, period) {
    const usage = await this.storage.getUsageForPeriod(customerId, period);
    let totalCharges = 0;
    const breakdown = {};

    for (const [eventType, quantity] of Object.entries(usage)) {
      const tiers = this.pricingTiers.get(eventType);
      if (!tiers) continue;

      const charge = this._calculateTieredPricing(quantity, tiers);
      totalCharges += charge;
      breakdown[eventType] = { quantity, charge };
    }

    return { totalCharges, breakdown };
  }

  _calculateTieredPricing(quantity, tiers) {
    let remaining = quantity;
    let cost = 0;

    for (const tier of tiers) {
      if (remaining <= 0) break;

      const tierQuantity = tier.max
        ? Math.min(remaining, tier.max - (tier.min || 0))
        : remaining;

      cost += tierQuantity * tier.price;
      remaining -= tierQuantity;
    }

    return cost;
  }

  async _checkOverage(customerId, eventType, usage) {
    const subscription = await this.storage.getSubscription(customerId);
    const limit = subscription?.limits?.[eventType];

    if (limit && usage.total > limit) {
      const overage = usage.total - limit;
      await this.storage.recordOverage(customerId, {
        eventType,
        limit,
        usage: usage.total,
        overage,
        date: new Date().toISOString()
      });

      consola.warn(`Overage detected: ${customerId} - ${eventType} - ${overage}`);
    }
  }

  async _checkAlerts(customerId, eventType, usage) {
    const key = `${customerId}:${eventType}`;
    const threshold = this.alertThresholds.get(key);

    if (threshold && usage.total >= threshold) {
      await this.storage.queueAlert({
        customerId,
        type: 'usage_threshold',
        eventType,
        threshold,
        current: usage.total,
        date: new Date().toISOString()
      });
    }
  }
}
