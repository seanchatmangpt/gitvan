import { createHash } from "crypto";
import { useGitVan } from "../core/context.mjs";
import { useFileSystem } from "../composables/filesystem.mjs";
import { join } from "path";

const REVOPS_DIR = ".revops";
const SUBSCRIPTIONS_DIR = "subscriptions";
const EVENTS_DIR = "events";
const USAGE_DIR = "usage";

const STATES = {
  TRIAL: "trial",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
  PAST_DUE: "past_due",
};

const TRANSITIONS = {
  [STATES.TRIAL]: [STATES.ACTIVE, STATES.CANCELLED],
  [STATES.ACTIVE]: [STATES.SUSPENDED, STATES.CANCELLED, STATES.PAST_DUE],
  [STATES.SUSPENDED]: [STATES.ACTIVE, STATES.CANCELLED],
  [STATES.CANCELLED]: [],
  [STATES.PAST_DUE]: [STATES.ACTIVE, STATES.SUSPENDED, STATES.CANCELLED],
};

const FREQUENCIES = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
  CUSTOM: "custom",
};

function hashContent(content) {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString();
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result.toISOString();
}

function addYears(date, years) {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result.toISOString();
}

function calculateDaysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate - startDate;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function useSubscriptionManager() {
  const { repo } = useGitVan();
  const fs = useFileSystem();

  const basePath = join(repo, REVOPS_DIR);

  async function ensureDirectories() {
    await fs.mkdir(basePath, { recursive: true });
    await fs.mkdir(join(basePath, SUBSCRIPTIONS_DIR), { recursive: true });
    await fs.mkdir(join(basePath, EVENTS_DIR), { recursive: true });
    await fs.mkdir(join(basePath, USAGE_DIR), { recursive: true });
  }

  async function readJSON(filePath) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch (error) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async function writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  function validateStateTransition(currentState, newState) {
    const allowedStates = TRANSITIONS[currentState] || [];
    return allowedStates.includes(newState);
  }

  function calculateNextBillingDate(currentDate, frequency, customDays = null) {
    const date = currentDate instanceof Date ? currentDate.toISOString() : currentDate;

    switch (frequency) {
      case FREQUENCIES.MONTHLY:
        return addMonths(date, 1);
      case FREQUENCIES.ANNUAL:
        return addYears(date, 1);
      case FREQUENCIES.CUSTOM:
        if (customDays) {
          return addDays(date, customDays);
        }
        throw new Error("customDays required for CUSTOM frequency");
      default:
        throw new Error(`Invalid frequency: ${frequency}`);
    }
  }

  function calculateProration(oldAmount, newAmount, daysRemaining, totalDays) {
    const unusedCredit = (oldAmount / totalDays) * daysRemaining;
    const newCharge = (newAmount / totalDays) * daysRemaining;
    const proratedAmount = newCharge - unusedCredit;
    return Math.round(proratedAmount * 100) / 100;
  }

  function calculateRefund(amount, daysUsed, totalDays) {
    const usedAmount = (amount / totalDays) * daysUsed;
    const refundAmount = amount - usedAmount;
    return Math.round(refundAmount * 100) / 100;
  }

  async function emitEvent(eventType, data) {
    await ensureDirectories();
    const timestamp = new Date().toISOString();
    const eventId = hashContent({ eventType, data, timestamp });
    const eventPath = join(basePath, EVENTS_DIR, `${eventId}.json`);

    await writeJSON(eventPath, {
      id: eventId,
      type: eventType,
      timestamp,
      data,
    });
  }

  async function createSubscription(options) {
    await ensureDirectories();

    const {
      customerId,
      planId,
      amount,
      currency = "usd",
      startDate = new Date().toISOString(),
      billingFrequency = FREQUENCIES.MONTHLY,
      customBillingDays = null,
      trialDays = 0,
      metadata = {},
    } = options;

    if (!customerId || !planId) {
      throw new Error("customerId and planId are required");
    }

    if (amount === undefined || amount === null) {
      throw new Error("amount is required");
    }

    const subscriptionId = hashContent({
      customerId,
      planId,
      startDate,
      timestamp: Date.now(),
    });

    const start = new Date(startDate);
    const trialEnd = trialDays > 0 ? addDays(startDate, trialDays) : null;
    const state = trialDays > 0 ? STATES.TRIAL : STATES.ACTIVE;

    const currentPeriodStart = trialEnd || startDate;
    const currentPeriodEnd = calculateNextBillingDate(
      currentPeriodStart,
      billingFrequency,
      customBillingDays
    );

    const subscription = {
      id: subscriptionId,
      customerId,
      planId,
      amount,
      currency,
      state,
      billingFrequency,
      customBillingDays,
      startDate,
      trialDays,
      trialEndDate: trialEnd,
      currentPeriodStart,
      currentPeriodEnd,
      nextBillingDate: currentPeriodEnd,
      cancelledAt: null,
      suspendedAt: null,
      metadata,
      usage: [],
      history: [
        {
          timestamp: new Date().toISOString(),
          event: "subscription_created",
          state,
          data: { trialDays, amount, planId },
        },
      ],
    };

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);
    await emitEvent("subscription.created", subscription);

    return subscription;
  }

  async function getSubscription(subscriptionId) {
    await ensureDirectories();
    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    const subscription = await readJSON(subPath);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    return subscription;
  }

  async function updateSubscriptionState(subscriptionId, newState, reason = "") {
    const subscription = await getSubscription(subscriptionId);

    if (!validateStateTransition(subscription.state, newState)) {
      throw new Error(
        `Invalid state transition from ${subscription.state} to ${newState}`
      );
    }

    const oldState = subscription.state;
    subscription.state = newState;

    const historyEntry = {
      timestamp: new Date().toISOString(),
      event: "state_changed",
      oldState,
      newState,
      reason,
    };

    switch (newState) {
      case STATES.SUSPENDED:
        subscription.suspendedAt = new Date().toISOString();
        break;
      case STATES.CANCELLED:
        subscription.cancelledAt = new Date().toISOString();
        break;
      case STATES.ACTIVE:
        if (oldState === STATES.SUSPENDED) {
          subscription.suspendedAt = null;
        }
        break;
    }

    subscription.history.push(historyEntry);

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);
    await emitEvent(`subscription.${newState}`, subscription);

    return subscription;
  }

  async function upgradePlan(subscriptionId, newPlanId, options = {}) {
    const { immediate = false, newAmount = null } = options;
    const subscription = await getSubscription(subscriptionId);

    if (subscription.state !== STATES.ACTIVE && subscription.state !== STATES.TRIAL) {
      throw new Error(`Cannot upgrade subscription in ${subscription.state} state`);
    }

    const now = new Date();
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const totalDays = calculateDaysBetween(subscription.currentPeriodStart, subscription.currentPeriodEnd);
    const daysRemaining = calculateDaysBetween(now.toISOString(), subscription.currentPeriodEnd);

    let prorationAmount = null;
    if (immediate && newAmount !== null) {
      prorationAmount = calculateProration(
        subscription.amount,
        newAmount,
        daysRemaining,
        totalDays
      );
    }

    const oldPlanId = subscription.planId;
    subscription.planId = newPlanId;

    if (newAmount !== null) {
      subscription.amount = newAmount;
    }

    if (immediate) {
      subscription.currentPeriodStart = now.toISOString();
      subscription.currentPeriodEnd = calculateNextBillingDate(
        now.toISOString(),
        subscription.billingFrequency,
        subscription.customBillingDays
      );
      subscription.nextBillingDate = subscription.currentPeriodEnd;
    }

    subscription.history.push({
      timestamp: now.toISOString(),
      event: "plan_upgraded",
      oldPlanId,
      newPlanId,
      immediate,
      prorationAmount,
    });

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);
    await emitEvent("subscription.plan_changed", {
      subscription,
      change: "upgrade",
      prorationAmount,
    });

    return { subscription, prorationAmount };
  }

  async function downgradePlan(subscriptionId, newPlanId, options = {}) {
    const { immediate = false, newAmount = null } = options;
    const subscription = await getSubscription(subscriptionId);

    if (subscription.state !== STATES.ACTIVE && subscription.state !== STATES.TRIAL) {
      throw new Error(`Cannot downgrade subscription in ${subscription.state} state`);
    }

    const now = new Date();
    const oldPlanId = subscription.planId;

    if (!immediate) {
      subscription.metadata.pendingDowngrade = {
        planId: newPlanId,
        amount: newAmount,
        effectiveDate: subscription.currentPeriodEnd,
      };
    } else {
      subscription.planId = newPlanId;
      if (newAmount !== null) {
        subscription.amount = newAmount;
      }
      subscription.currentPeriodStart = now.toISOString();
      subscription.currentPeriodEnd = calculateNextBillingDate(
        now.toISOString(),
        subscription.billingFrequency,
        subscription.customBillingDays
      );
      subscription.nextBillingDate = subscription.currentPeriodEnd;
    }

    subscription.history.push({
      timestamp: now.toISOString(),
      event: "plan_downgraded",
      oldPlanId,
      newPlanId,
      immediate,
    });

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);
    await emitEvent("subscription.plan_changed", {
      subscription,
      change: "downgrade",
    });

    return subscription;
  }

  async function pauseSubscription(subscriptionId, reason = "") {
    return await updateSubscriptionState(subscriptionId, STATES.SUSPENDED, reason);
  }

  async function resumeSubscription(subscriptionId) {
    const subscription = await getSubscription(subscriptionId);

    if (subscription.state !== STATES.SUSPENDED) {
      throw new Error("Only suspended subscriptions can be resumed");
    }

    const now = new Date();
    const suspendedAt = new Date(subscription.suspendedAt);
    const suspendedDays = calculateDaysBetween(subscription.suspendedAt, now.toISOString());

    const newPeriodEnd = addDays(subscription.currentPeriodEnd, suspendedDays);
    subscription.currentPeriodEnd = newPeriodEnd;
    subscription.nextBillingDate = newPeriodEnd;

    return await updateSubscriptionState(
      subscriptionId,
      STATES.ACTIVE,
      `Resumed after ${suspendedDays} days suspension`
    );
  }

  async function cancelSubscription(subscriptionId, options = {}) {
    const {
      immediate = false,
      refund = false,
      amount = null,
      reason = "",
    } = options;

    const subscription = await getSubscription(subscriptionId);

    if (subscription.state === STATES.CANCELLED) {
      throw new Error("Subscription already cancelled");
    }

    let refundAmount = null;
    if (refund && amount !== null && amount > 0) {
      const now = new Date();
      const periodStart = new Date(subscription.currentPeriodStart);
      const totalDays = calculateDaysBetween(subscription.currentPeriodStart, subscription.currentPeriodEnd);
      const daysUsed = calculateDaysBetween(subscription.currentPeriodStart, now.toISOString());

      refundAmount = calculateRefund(amount, daysUsed, totalDays);
    }

    const cancelledAt = new Date().toISOString();
    subscription.cancelledAt = cancelledAt;

    if (!immediate) {
      subscription.metadata.cancellationEffectiveDate = subscription.currentPeriodEnd;
      subscription.metadata.cancelAtPeriodEnd = true;
    }

    subscription.history.push({
      timestamp: cancelledAt,
      event: "subscription_cancelled",
      immediate,
      refundAmount,
      reason,
    });

    if (immediate) {
      subscription.state = STATES.CANCELLED;
    }

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);
    await emitEvent("subscription.cancelled", {
      subscription,
      refundAmount,
      immediate,
    });

    return { subscription, refundAmount };
  }

  async function recordUsage(subscriptionId, usageData) {
    const {
      metricId,
      quantity,
      timestamp = new Date().toISOString(),
      metadata = {},
    } = usageData;

    if (!metricId || quantity === undefined) {
      throw new Error("metricId and quantity are required");
    }

    const subscription = await getSubscription(subscriptionId);

    const usageId = hashContent({
      subscriptionId,
      metricId,
      quantity,
      timestamp,
    });

    const usageRecord = {
      id: usageId,
      subscriptionId,
      metricId,
      quantity,
      timestamp,
      metadata,
    };

    subscription.usage.push(usageRecord);

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);

    const usagePath = join(basePath, USAGE_DIR, `${usageId}.json`);
    await writeJSON(usagePath, usageRecord);

    await emitEvent("subscription.usage_recorded", {
      subscription,
      usageRecord,
    });

    return usageRecord;
  }

  async function calculateUsageCharges(subscriptionId, options = {}) {
    const {
      metricId,
      unitPrice = 0,
      includedQuantity = 0,
      startDate = null,
      endDate = null,
    } = options;

    const subscription = await getSubscription(subscriptionId);

    let usageRecords = subscription.usage.filter((u) => u.metricId === metricId);

    if (startDate) {
      usageRecords = usageRecords.filter((u) => u.timestamp >= startDate);
    }
    if (endDate) {
      usageRecords = usageRecords.filter((u) => u.timestamp <= endDate);
    }

    const totalQuantity = usageRecords.reduce((sum, u) => sum + u.quantity, 0);
    const billableQuantity = Math.max(0, totalQuantity - includedQuantity);
    const charges = billableQuantity * unitPrice;

    return {
      metricId,
      totalQuantity,
      includedQuantity,
      billableQuantity,
      unitPrice,
      charges: Math.round(charges * 100) / 100,
      records: usageRecords,
    };
  }

  async function listSubscriptions(filters = {}) {
    await ensureDirectories();
    const { customerId, state, planId } = filters;
    const subsDir = join(basePath, SUBSCRIPTIONS_DIR);
    const files = await fs.readdir(subsDir);

    const subscriptions = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        const subscription = await readJSON(join(subsDir, file));
        if (!subscription) continue;

        let matches = true;
        if (customerId && subscription.customerId !== customerId) matches = false;
        if (state && subscription.state !== state) matches = false;
        if (planId && subscription.planId !== planId) matches = false;

        if (matches) {
          subscriptions.push(subscription);
        }
      }
    }

    return subscriptions;
  }

  async function processGracePeriod(subscriptionId, graceDays = 3) {
    const subscription = await getSubscription(subscriptionId);

    if (subscription.state !== STATES.PAST_DUE) {
      throw new Error("Subscription is not in past_due state");
    }

    const pastDueEvent = subscription.history
      .slice()
      .reverse()
      .find((h) => h.event === "state_changed" && h.newState === STATES.PAST_DUE);

    if (!pastDueEvent) {
      throw new Error("Cannot find past_due transition");
    }

    const now = new Date();
    const pastDueDate = new Date(pastDueEvent.timestamp);
    const gracePeriodEnd = addDays(pastDueEvent.timestamp, graceDays);
    const gracePeriodEndDate = new Date(gracePeriodEnd);

    const isInGracePeriod = now < gracePeriodEndDate;
    const daysRemaining = isInGracePeriod
      ? Math.ceil((gracePeriodEndDate - now) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      subscriptionId,
      isInGracePeriod,
      gracePeriodEnd,
      daysRemaining,
      shouldCancel: !isInGracePeriod,
    };
  }

  async function advanceBillingCycle(subscriptionId) {
    const subscription = await getSubscription(subscriptionId);

    if (
      subscription.state === STATES.CANCELLED ||
      subscription.state === STATES.SUSPENDED
    ) {
      throw new Error(
        `Cannot advance billing for ${subscription.state} subscription`
      );
    }

    const now = new Date().toISOString();

    if (subscription.state === STATES.TRIAL) {
      subscription.state = STATES.ACTIVE;
      subscription.history.push({
        timestamp: now,
        event: "trial_ended",
        newState: STATES.ACTIVE,
      });
    }

    if (subscription.metadata.pendingDowngrade) {
      const pending = subscription.metadata.pendingDowngrade;
      subscription.planId = pending.planId;
      if (pending.amount !== null && pending.amount !== undefined) {
        subscription.amount = pending.amount;
      }
      subscription.history.push({
        timestamp: now,
        event: "pending_downgrade_applied",
        planId: pending.planId,
      });
      delete subscription.metadata.pendingDowngrade;
    }

    if (subscription.metadata.cancelAtPeriodEnd) {
      subscription.state = STATES.CANCELLED;
      subscription.history.push({
        timestamp: now,
        event: "subscription_cancelled_at_period_end",
        newState: STATES.CANCELLED,
      });
    } else {
      subscription.currentPeriodStart = subscription.currentPeriodEnd;
      subscription.currentPeriodEnd = calculateNextBillingDate(
        subscription.currentPeriodEnd,
        subscription.billingFrequency,
        subscription.customBillingDays
      );
      subscription.nextBillingDate = subscription.currentPeriodEnd;

      subscription.history.push({
        timestamp: now,
        event: "billing_cycle_advanced",
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      });
    }

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    await writeJSON(subPath, subscription);
    await emitEvent("subscription.billing_cycle_advanced", subscription);

    return subscription;
  }

  return {
    STATES,
    FREQUENCIES,
    createSubscription,
    getSubscription,
    updateSubscriptionState,
    upgradePlan,
    downgradePlan,
    pauseSubscription,
    resumeSubscription,
    cancelSubscription,
    recordUsage,
    calculateUsageCharges,
    listSubscriptions,
    processGracePeriod,
    advanceBillingCycle,
  };
}
