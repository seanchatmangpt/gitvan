import { describe, it, expect, beforeEach, vi } from "vitest";

class SubscriptionManager {
  constructor(options = {}) {
    this.subscriptions = new Map();
    this.billingCycles = new Map();
    this.prorationType = options.prorationType || 'daily';
  }

  async createSubscription(data) {
    const { id, customerId, planId, startDate, billingCycle } = data;

    if (!id || !customerId || !planId || !billingCycle) {
      throw new Error('Missing required subscription fields');
    }

    if (!['monthly', 'quarterly', 'yearly'].includes(billingCycle)) {
      throw new Error('Invalid billing cycle');
    }

    const subscription = {
      id,
      customerId,
      planId,
      startDate: startDate || Date.now(),
      billingCycle,
      status: 'active',
      currentPeriodStart: startDate || Date.now(),
      currentPeriodEnd: this._calculatePeriodEnd(startDate || Date.now(), billingCycle),
      createdAt: Date.now(),
      metadata: {}
    };

    this.subscriptions.set(id, subscription);
    return subscription;
  }

  async updateSubscription(id, updates) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === 'cancelled') {
      throw new Error('Cannot update cancelled subscription');
    }

    Object.assign(subscription, updates, { updatedAt: Date.now() });
    return subscription;
  }

  async cancelSubscription(id, options = {}) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status === 'cancelled') {
      throw new Error('Subscription already cancelled');
    }

    const immediate = options.immediate !== undefined ? options.immediate : false;

    if (immediate) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = Date.now();
      subscription.endDate = Date.now();
    } else {
      subscription.status = 'pending_cancellation';
      subscription.cancelledAt = Date.now();
      subscription.endDate = subscription.currentPeriodEnd;
    }

    return subscription;
  }

  async pauseSubscription(id) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Can only pause active subscriptions');
    }

    subscription.status = 'paused';
    subscription.pausedAt = Date.now();
    return subscription;
  }

  async resumeSubscription(id) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'paused') {
      throw new Error('Can only resume paused subscriptions');
    }

    subscription.status = 'active';
    subscription.resumedAt = Date.now();
    delete subscription.pausedAt;
    return subscription;
  }

  async changeSubscriptionPlan(id, newPlanId, options = {}) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Can only change plan for active subscriptions');
    }

    const oldPlanId = subscription.planId;
    subscription.planId = newPlanId;
    subscription.previousPlanId = oldPlanId;
    subscription.planChangedAt = Date.now();

    if (options.prorate) {
      subscription.proratedAmount = this._calculateProration(subscription, oldPlanId, newPlanId);
    }

    return subscription;
  }

  _calculateProration(subscription, oldPlanId, newPlanId) {
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysRemaining * 0.50;
  }

  async renewSubscription(id) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'active') {
      throw new Error('Can only renew active subscriptions');
    }

    const oldPeriodEnd = subscription.currentPeriodEnd;
    subscription.currentPeriodStart = oldPeriodEnd;
    subscription.currentPeriodEnd = this._calculatePeriodEnd(oldPeriodEnd, subscription.billingCycle);
    subscription.renewedAt = Date.now();

    return subscription;
  }

  _calculatePeriodEnd(startDate, billingCycle) {
    const start = new Date(startDate);
    let end = new Date(start);

    switch (billingCycle) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }

    return end.getTime();
  }

  getSubscription(id) {
    return this.subscriptions.get(id);
  }

  getCustomerSubscriptions(customerId) {
    return Array.from(this.subscriptions.values())
      .filter(s => s.customerId === customerId);
  }

  getActiveSubscriptions() {
    return Array.from(this.subscriptions.values())
      .filter(s => s.status === 'active');
  }

  async trialSubscription(id, trialDays) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'trial';
    subscription.trialStart = Date.now();
    subscription.trialEnd = Date.now() + (trialDays * 24 * 60 * 60 * 1000);

    return subscription;
  }

  async convertTrialToActive(id) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    if (subscription.status !== 'trial') {
      throw new Error('Can only convert trial subscriptions');
    }

    subscription.status = 'active';
    subscription.convertedAt = Date.now();
    delete subscription.trialStart;
    delete subscription.trialEnd;

    return subscription;
  }

  isSubscriptionExpired(id) {
    const subscription = this.subscriptions.get(id);
    if (!subscription) return false;

    return subscription.currentPeriodEnd < Date.now();
  }

  async addMetadata(id, key, value) {
    const subscription = this.subscriptions.get(id);

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.metadata[key] = value;
    return subscription;
  }
}

describe('SubscriptionManager - Creation', () => {
  let manager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  it('should create a monthly subscription', async () => {
    const subscription = await manager.createSubscription({
      id: 'sub_001',
      customerId: 'cust_001',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    expect(subscription.id).toBe('sub_001');
    expect(subscription.status).toBe('active');
    expect(subscription.billingCycle).toBe('monthly');
  });

  it('should create a quarterly subscription', async () => {
    const subscription = await manager.createSubscription({
      id: 'sub_002',
      customerId: 'cust_002',
      planId: 'plan_pro',
      billingCycle: 'quarterly'
    });

    expect(subscription.billingCycle).toBe('quarterly');
    expect(subscription.currentPeriodEnd).toBeGreaterThan(subscription.currentPeriodStart);
    expect(subscription.status).toBe('active');
  });

  it('should create a yearly subscription', async () => {
    const subscription = await manager.createSubscription({
      id: 'sub_003',
      customerId: 'cust_003',
      planId: 'plan_enterprise',
      billingCycle: 'yearly'
    });

    expect(subscription.billingCycle).toBe('yearly');
    expect(subscription.currentPeriodEnd).toBeGreaterThan(subscription.currentPeriodStart);
    expect(subscription.status).toBe('active');
  });

  it('should validate required fields', async () => {
    await expect(manager.createSubscription({
      id: 'sub_004',
      customerId: 'cust_004'
    })).rejects.toThrow('Missing required subscription fields');

    expect(manager.subscriptions.size).toBe(0);
  });

  it('should reject invalid billing cycles', async () => {
    await expect(manager.createSubscription({
      id: 'sub_005',
      customerId: 'cust_005',
      planId: 'plan_basic',
      billingCycle: 'weekly'
    })).rejects.toThrow('Invalid billing cycle');

    expect(manager.subscriptions.size).toBe(0);
  });

  it('should set creation timestamp', async () => {
    const before = Date.now();
    const subscription = await manager.createSubscription({
      id: 'sub_006',
      customerId: 'cust_006',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    expect(subscription.createdAt).toBeGreaterThanOrEqual(before);
    expect(subscription.createdAt).toBeLessThanOrEqual(Date.now());
  });
});

describe('SubscriptionManager - State Transitions', () => {
  let manager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  it('should transition from active to paused', async () => {
    await manager.createSubscription({
      id: 'sub_010',
      customerId: 'cust_010',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.pauseSubscription('sub_010');

    expect(subscription.status).toBe('paused');
    expect(subscription.pausedAt).toBeDefined();
  });

  it('should transition from paused to active', async () => {
    await manager.createSubscription({
      id: 'sub_011',
      customerId: 'cust_011',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await manager.pauseSubscription('sub_011');
    const subscription = await manager.resumeSubscription('sub_011');

    expect(subscription.status).toBe('active');
    expect(subscription.resumedAt).toBeDefined();
    expect(subscription.pausedAt).toBeUndefined();
  });

  it('should transition from active to cancelled (immediate)', async () => {
    await manager.createSubscription({
      id: 'sub_012',
      customerId: 'cust_012',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.cancelSubscription('sub_012', { immediate: true });

    expect(subscription.status).toBe('cancelled');
    expect(subscription.cancelledAt).toBeDefined();
    expect(subscription.endDate).toBe(subscription.cancelledAt);
  });

  it('should transition from active to pending_cancellation (end of period)', async () => {
    await manager.createSubscription({
      id: 'sub_013',
      customerId: 'cust_013',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.cancelSubscription('sub_013', { immediate: false });

    expect(subscription.status).toBe('pending_cancellation');
    expect(subscription.endDate).toBe(subscription.currentPeriodEnd);
  });

  it('should transition from trial to active', async () => {
    await manager.createSubscription({
      id: 'sub_014',
      customerId: 'cust_014',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await manager.trialSubscription('sub_014', 14);
    const subscription = await manager.convertTrialToActive('sub_014');

    expect(subscription.status).toBe('active');
    expect(subscription.convertedAt).toBeDefined();
    expect(subscription.trialStart).toBeUndefined();
  });

  it('should prevent pausing non-active subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_015',
      customerId: 'cust_015',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await manager.pauseSubscription('sub_015');

    await expect(manager.pauseSubscription('sub_015'))
      .rejects.toThrow('Can only pause active subscriptions');
  });

  it('should prevent resuming non-paused subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_016',
      customerId: 'cust_016',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await expect(manager.resumeSubscription('sub_016'))
      .rejects.toThrow('Can only resume paused subscriptions');
  });

  it('should prevent double cancellation', async () => {
    await manager.createSubscription({
      id: 'sub_017',
      customerId: 'cust_017',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await manager.cancelSubscription('sub_017', { immediate: true });

    await expect(manager.cancelSubscription('sub_017'))
      .rejects.toThrow('Subscription already cancelled');
  });
});

describe('SubscriptionManager - Billing Cycles', () => {
  let manager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  it('should calculate monthly period correctly', async () => {
    const startDate = new Date('2024-01-15').getTime();
    const subscription = await manager.createSubscription({
      id: 'sub_020',
      customerId: 'cust_020',
      planId: 'plan_basic',
      billingCycle: 'monthly',
      startDate
    });

    const expectedEnd = new Date('2024-02-15').getTime();
    const diff = Math.abs(subscription.currentPeriodEnd - expectedEnd);
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('should calculate quarterly period correctly', async () => {
    const startDate = new Date('2024-01-15').getTime();
    const subscription = await manager.createSubscription({
      id: 'sub_021',
      customerId: 'cust_021',
      planId: 'plan_pro',
      billingCycle: 'quarterly',
      startDate
    });

    const expectedEnd = new Date('2024-04-15').getTime();
    const diff = Math.abs(subscription.currentPeriodEnd - expectedEnd);
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('should calculate yearly period correctly', async () => {
    const startDate = new Date('2024-01-15').getTime();
    const subscription = await manager.createSubscription({
      id: 'sub_022',
      customerId: 'cust_022',
      planId: 'plan_enterprise',
      billingCycle: 'yearly',
      startDate
    });

    const expectedEnd = new Date('2025-01-15').getTime();
    const diff = Math.abs(subscription.currentPeriodEnd - expectedEnd);
    expect(diff).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('should renew subscription and update periods', async () => {
    await manager.createSubscription({
      id: 'sub_023',
      customerId: 'cust_023',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const original = manager.getSubscription('sub_023');
    const originalEnd = original.currentPeriodEnd;

    const renewed = await manager.renewSubscription('sub_023');

    expect(renewed.currentPeriodStart).toBe(originalEnd);
    expect(renewed.currentPeriodEnd).toBeGreaterThan(originalEnd);
    expect(renewed.renewedAt).toBeDefined();
  });

  it('should detect expired subscriptions', async () => {
    const pastDate = Date.now() - (60 * 24 * 60 * 60 * 1000);
    await manager.createSubscription({
      id: 'sub_024',
      customerId: 'cust_024',
      planId: 'plan_basic',
      billingCycle: 'monthly',
      startDate: pastDate
    });

    const expired = manager.isSubscriptionExpired('sub_024');
    expect(expired).toBe(true);
  });

  it('should detect non-expired subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_025',
      customerId: 'cust_025',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const expired = manager.isSubscriptionExpired('sub_025');
    expect(expired).toBe(false);
  });
});

describe('SubscriptionManager - Plan Changes & Proration', () => {
  let manager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  it('should change subscription plan', async () => {
    await manager.createSubscription({
      id: 'sub_030',
      customerId: 'cust_030',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.changeSubscriptionPlan('sub_030', 'plan_pro');

    expect(subscription.planId).toBe('plan_pro');
    expect(subscription.previousPlanId).toBe('plan_basic');
    expect(subscription.planChangedAt).toBeDefined();
  });

  it('should calculate proration when requested', async () => {
    await manager.createSubscription({
      id: 'sub_031',
      customerId: 'cust_031',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.changeSubscriptionPlan('sub_031', 'plan_pro', { prorate: true });

    expect(subscription.proratedAmount).toBeDefined();
    expect(subscription.proratedAmount).toBeGreaterThan(0);
  });

  it('should not calculate proration when not requested', async () => {
    await manager.createSubscription({
      id: 'sub_032',
      customerId: 'cust_032',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.changeSubscriptionPlan('sub_032', 'plan_pro', { prorate: false });

    expect(subscription.proratedAmount).toBeUndefined();
  });

  it('should prevent plan change for non-active subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_033',
      customerId: 'cust_033',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await manager.pauseSubscription('sub_033');

    await expect(manager.changeSubscriptionPlan('sub_033', 'plan_pro'))
      .rejects.toThrow('Can only change plan for active subscriptions');
  });
});

describe('SubscriptionManager - Queries & Metadata', () => {
  let manager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  it('should retrieve subscription by id', async () => {
    await manager.createSubscription({
      id: 'sub_040',
      customerId: 'cust_040',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = manager.getSubscription('sub_040');

    expect(subscription).toBeDefined();
    expect(subscription.id).toBe('sub_040');
  });

  it('should retrieve all customer subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_041',
      customerId: 'cust_041',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });
    await manager.createSubscription({
      id: 'sub_042',
      customerId: 'cust_041',
      planId: 'plan_pro',
      billingCycle: 'yearly'
    });

    const subscriptions = manager.getCustomerSubscriptions('cust_041');

    expect(subscriptions).toHaveLength(2);
    expect(subscriptions[0].customerId).toBe('cust_041');
    expect(subscriptions[1].customerId).toBe('cust_041');
  });

  it('should retrieve only active subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_043',
      customerId: 'cust_043',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });
    await manager.createSubscription({
      id: 'sub_044',
      customerId: 'cust_044',
      planId: 'plan_pro',
      billingCycle: 'monthly'
    });
    await manager.pauseSubscription('sub_044');

    const activeSubscriptions = manager.getActiveSubscriptions();

    expect(activeSubscriptions).toHaveLength(1);
    expect(activeSubscriptions[0].id).toBe('sub_043');
  });

  it('should add metadata to subscription', async () => {
    await manager.createSubscription({
      id: 'sub_045',
      customerId: 'cust_045',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.addMetadata('sub_045', 'source', 'web');

    expect(subscription.metadata.source).toBe('web');
  });

  it('should update subscription fields', async () => {
    await manager.createSubscription({
      id: 'sub_046',
      customerId: 'cust_046',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    const subscription = await manager.updateSubscription('sub_046', {
      customNote: 'VIP customer'
    });

    expect(subscription.customNote).toBe('VIP customer');
    expect(subscription.updatedAt).toBeDefined();
  });

  it('should prevent updating cancelled subscriptions', async () => {
    await manager.createSubscription({
      id: 'sub_047',
      customerId: 'cust_047',
      planId: 'plan_basic',
      billingCycle: 'monthly'
    });

    await manager.cancelSubscription('sub_047', { immediate: true });

    await expect(manager.updateSubscription('sub_047', { customNote: 'test' }))
      .rejects.toThrow('Cannot update cancelled subscription');
  });
});
