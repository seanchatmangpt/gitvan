import { createHash } from "crypto";
import { useGitVan } from "../core/context.mjs";
import { useFileSystem } from "../composables/file-system.mjs";
import { join } from "path";

const REVOPS_DIR = ".revops";
const PAYMENTS_DIR = "payments";
const SUBSCRIPTIONS_DIR = "subscriptions";
const REVENUE_DIR = "revenue";
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000;

function hashContent(content) {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

function calculateBackoff(attempt) {
  return BASE_RETRY_DELAY * Math.pow(2, attempt);
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function getDaysBetween(start, end) {
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function usePaymentProcessor() {
  const { repo } = useGitVan();
  const fs = useFileSystem();

  const basePath = join(repo, REVOPS_DIR);

  async function ensureDirectories() {
    await fs.mkdir(basePath, { recursive: true });
    await fs.mkdir(join(basePath, PAYMENTS_DIR), { recursive: true });
    await fs.mkdir(join(basePath, SUBSCRIPTIONS_DIR), { recursive: true });
    await fs.mkdir(join(basePath, REVENUE_DIR), { recursive: true });
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

  async function mockPaymentGateway(payment) {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (payment.paymentMethod.type === "invalid") {
      throw new Error("Invalid payment method");
    }

    if (payment.amount <= 0) {
      throw new Error("Invalid amount");
    }

    const shouldFail = payment.paymentMethod.testMode === "fail";
    if (shouldFail) {
      throw new Error("Payment gateway declined");
    }

    return {
      gatewayTransactionId: hashContent({
        payment,
        timestamp: Date.now(),
      }).slice(0, 16),
      status: "completed",
      processedAt: new Date().toISOString(),
    };
  }

  async function processPayment(paymentData) {
    await ensureDirectories();

    const payment = {
      id: hashContent(paymentData),
      ...paymentData,
      status: "pending",
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastAttemptAt: null,
      gatewayTransactionId: null,
    };

    const paymentPath = join(basePath, PAYMENTS_DIR, `${payment.id}.json`);
    await writeJSON(paymentPath, payment);

    try {
      const result = await mockPaymentGateway(payment);

      payment.status = "succeeded";
      payment.gatewayTransactionId = result.gatewayTransactionId;
      payment.processedAt = result.processedAt;
      payment.attempts = 1;
      payment.lastAttemptAt = new Date().toISOString();

      await writeJSON(paymentPath, payment);
      await recordRevenueEvent(payment);

      return payment;
    } catch (error) {
      payment.status = "failed";
      payment.attempts = 1;
      payment.lastAttemptAt = new Date().toISOString();
      payment.errorMessage = error.message;

      await writeJSON(paymentPath, payment);

      throw error;
    }
  }

  async function retryPayment(paymentId) {
    await ensureDirectories();

    const paymentPath = join(basePath, PAYMENTS_DIR, `${paymentId}.json`);
    const payment = await readJSON(paymentPath);

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status === "succeeded") {
      throw new Error(`Payment ${paymentId} already succeeded`);
    }

    if (payment.attempts >= MAX_RETRY_ATTEMPTS) {
      throw new Error(`Payment ${paymentId} exceeded max retry attempts`);
    }

    const backoffDelay = calculateBackoff(payment.attempts);
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));

    payment.attempts += 1;
    payment.lastAttemptAt = new Date().toISOString();

    try {
      const result = await mockPaymentGateway(payment);

      payment.status = "succeeded";
      payment.gatewayTransactionId = result.gatewayTransactionId;
      payment.processedAt = result.processedAt;

      await writeJSON(paymentPath, payment);
      await recordRevenueEvent(payment);

      return payment;
    } catch (error) {
      payment.status = "failed";
      payment.errorMessage = error.message;

      await writeJSON(paymentPath, payment);

      throw error;
    }
  }

  async function refundPayment(paymentId, amount, reason) {
    await ensureDirectories();

    const paymentPath = join(basePath, PAYMENTS_DIR, `${paymentId}.json`);
    const payment = await readJSON(paymentPath);

    if (!payment) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    if (payment.status !== "succeeded") {
      throw new Error(`Payment ${paymentId} cannot be refunded (status: ${payment.status})`);
    }

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new Error("Refund amount exceeds payment amount");
    }

    const refund = {
      id: hashContent({ paymentId, amount: refundAmount, reason, timestamp: Date.now() }),
      paymentId,
      amount: refundAmount,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const refundPath = join(basePath, PAYMENTS_DIR, `refund_${refund.id}.json`);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      refund.status = "succeeded";
      refund.processedAt = new Date().toISOString();

      payment.refundedAmount = (payment.refundedAmount || 0) + refundAmount;
      if (payment.refundedAmount >= payment.amount) {
        payment.status = "refunded";
      }

      await writeJSON(paymentPath, payment);
      await writeJSON(refundPath, refund);

      await recordRevenueEvent({
        ...refund,
        type: "refund",
        amount: -refundAmount,
        currency: payment.currency,
        customerId: payment.customerId,
      });

      return refund;
    } catch (error) {
      refund.status = "failed";
      refund.errorMessage = error.message;
      await writeJSON(refundPath, refund);
      throw error;
    }
  }

  async function getPayment(paymentId) {
    await ensureDirectories();
    const paymentPath = join(basePath, PAYMENTS_DIR, `${paymentId}.json`);
    return await readJSON(paymentPath);
  }

  async function calculateFees(amount, currency) {
    const feeRate = 0.029;
    const fixedFee = currency === "usd" ? 0.30 : 0;
    const processingFee = amount * feeRate + fixedFee;

    return {
      amount,
      processingFee: Math.round(processingFee * 100) / 100,
      netAmount: Math.round((amount - processingFee) * 100) / 100,
    };
  }

  async function calculateTax(amount, taxRate) {
    const tax = amount * taxRate;
    return {
      subtotal: amount,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((amount + tax) * 100) / 100,
    };
  }

  async function createSubscription(subscriptionData) {
    await ensureDirectories();

    const subscription = {
      id: hashContent(subscriptionData),
      ...subscriptionData,
      status: "active",
      createdAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: addMonths(new Date(), 1).toISOString(),
      cancelAtPeriodEnd: false,
      billingCycleAnchor: new Date().toISOString(),
    };

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscription.id}.json`);
    await writeJSON(subPath, subscription);

    return subscription;
  }

  async function updateSubscription(subscriptionId, updates) {
    await ensureDirectories();

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    const subscription = await readJSON(subPath);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status === "canceled") {
      throw new Error(`Subscription ${subscriptionId} is already canceled`);
    }

    const oldAmount = subscription.amount;
    const newAmount = updates.amount || oldAmount;

    if (newAmount !== oldAmount) {
      const proration = await calculateProration(subscription, newAmount);
      Object.assign(subscription, updates, {
        proratedCredit: proration.credit,
        proratedCharge: proration.charge,
        updatedAt: new Date().toISOString(),
      });
    } else {
      Object.assign(subscription, updates, {
        updatedAt: new Date().toISOString(),
      });
    }

    await writeJSON(subPath, subscription);

    return subscription;
  }

  async function cancelSubscription(subscriptionId, immediate = false) {
    await ensureDirectories();

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    const subscription = await readJSON(subPath);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status === "canceled") {
      throw new Error(`Subscription ${subscriptionId} is already canceled`);
    }

    if (immediate) {
      subscription.status = "canceled";
      subscription.canceledAt = new Date().toISOString();
    } else {
      subscription.cancelAtPeriodEnd = true;
      subscription.cancelAt = subscription.currentPeriodEnd;
    }

    subscription.updatedAt = new Date().toISOString();

    await writeJSON(subPath, subscription);

    return subscription;
  }

  async function handleBillingCycle(subscriptionId) {
    await ensureDirectories();

    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    const subscription = await readJSON(subPath);

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status !== "active") {
      throw new Error(`Subscription ${subscriptionId} is not active`);
    }

    const now = new Date();
    const periodEnd = new Date(subscription.currentPeriodEnd);

    if (now < periodEnd) {
      throw new Error("Billing cycle not ready");
    }

    if (subscription.cancelAtPeriodEnd) {
      subscription.status = "canceled";
      subscription.canceledAt = now.toISOString();
      await writeJSON(subPath, subscription);
      return subscription;
    }

    try {
      const payment = await processPayment({
        customerId: subscription.customerId,
        amount: subscription.amount,
        currency: subscription.currency,
        paymentMethod: subscription.paymentMethod,
        description: `Subscription ${subscriptionId} billing cycle`,
        metadata: {
          subscriptionId,
          billingCycle: subscription.currentPeriodEnd,
        },
      });

      subscription.currentPeriodStart = subscription.currentPeriodEnd;
      subscription.currentPeriodEnd = addMonths(new Date(subscription.currentPeriodEnd), 1).toISOString();
      subscription.lastPaymentId = payment.id;
      subscription.updatedAt = new Date().toISOString();

      await writeJSON(subPath, subscription);

      return subscription;
    } catch (error) {
      subscription.status = "past_due";
      subscription.gracePeriodEnd = addDays(now, 7).toISOString();
      subscription.updatedAt = now.toISOString();
      await writeJSON(subPath, subscription);

      throw error;
    }
  }

  async function calculateProration(subscription, newAmount) {
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);
    const now = new Date();

    const totalDays = getDaysBetween(periodStart, periodEnd);
    const daysRemaining = getDaysBetween(now, periodEnd);
    const daysUsed = totalDays - daysRemaining;

    const oldDailyRate = subscription.amount / totalDays;
    const newDailyRate = newAmount / totalDays;

    const usedAmount = oldDailyRate * daysUsed;
    const remainingOldAmount = oldDailyRate * daysRemaining;
    const remainingNewAmount = newDailyRate * daysRemaining;

    const credit = remainingOldAmount;
    const charge = remainingNewAmount;
    const proratedDifference = charge - credit;

    return {
      credit: Math.round(credit * 100) / 100,
      charge: Math.round(charge * 100) / 100,
      proratedDifference: Math.round(proratedDifference * 100) / 100,
      daysRemaining,
      totalDays,
    };
  }

  async function getSubscription(subscriptionId) {
    await ensureDirectories();
    const subPath = join(basePath, SUBSCRIPTIONS_DIR, `${subscriptionId}.json`);
    return await readJSON(subPath);
  }

  async function recordRevenueEvent(event) {
    await ensureDirectories();

    const revenueEvent = {
      id: hashContent({ ...event, timestamp: Date.now() }),
      type: event.type || "payment",
      amount: event.amount,
      currency: event.currency,
      customerId: event.customerId,
      paymentId: event.id || event.paymentId,
      subscriptionId: event.metadata?.subscriptionId,
      timestamp: new Date().toISOString(),
      metadata: event.metadata || {},
    };

    const eventPath = join(basePath, REVENUE_DIR, `${revenueEvent.id}.json`);
    await writeJSON(eventPath, revenueEvent);

    return revenueEvent;
  }

  async function getPaymentHistory(customerId, limit = 100) {
    await ensureDirectories();

    const paymentsDir = join(basePath, PAYMENTS_DIR);
    const files = await fs.readdir(paymentsDir);

    const payments = [];
    for (const file of files) {
      if (!file.startsWith("refund_") && file.endsWith(".json")) {
        const payment = await readJSON(join(paymentsDir, file));
        if (payment && payment.customerId === customerId) {
          payments.push(payment);
        }
      }
    }

    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return payments.slice(0, limit);
  }

  async function calculateMRR() {
    await ensureDirectories();

    const subsDir = join(basePath, SUBSCRIPTIONS_DIR);
    const files = await fs.readdir(subsDir);

    let totalMRR = 0;
    const activeSubs = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const sub = await readJSON(join(subsDir, file));
        if (sub && sub.status === "active") {
          activeSubs.push(sub);
          totalMRR += sub.amount;
        }
      }
    }

    return {
      mrr: Math.round(totalMRR * 100) / 100,
      arr: Math.round(totalMRR * 12 * 100) / 100,
      activeSubscriptions: activeSubs.length,
      subscriptions: activeSubs,
    };
  }

  async function calculateARR() {
    const mrrData = await calculateMRR();
    return {
      arr: mrrData.arr,
      mrr: mrrData.mrr,
      activeSubscriptions: mrrData.activeSubscriptions,
    };
  }

  async function generateRevenueReport(startDate, endDate) {
    await ensureDirectories();

    const revenueDir = join(basePath, REVENUE_DIR);
    const files = await fs.readdir(revenueDir);

    const events = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const event = await readJSON(join(revenueDir, file));
        if (event) {
          const eventDate = new Date(event.timestamp);
          if (eventDate >= start && eventDate <= end) {
            events.push(event);
          }
        }
      }
    }

    const totalRevenue = events
      .filter((e) => e.type !== "refund")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalRefunds = events
      .filter((e) => e.type === "refund")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    const netRevenue = totalRevenue - totalRefunds;

    const byCustomer = events.reduce((acc, e) => {
      if (!acc[e.customerId]) {
        acc[e.customerId] = { revenue: 0, payments: 0, refunds: 0 };
      }
      if (e.type === "refund") {
        acc[e.customerId].refunds += Math.abs(e.amount);
      } else {
        acc[e.customerId].revenue += e.amount;
        acc[e.customerId].payments += 1;
      }
      return acc;
    }, {});

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalRefunds: Math.round(totalRefunds * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
        paymentCount: events.filter((e) => e.type !== "refund").length,
        refundCount: events.filter((e) => e.type === "refund").length,
      },
      byCustomer,
      events: events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    };
  }

  async function getPaymentStatus(paymentId) {
    const payment = await getPayment(paymentId);
    if (!payment) {
      return { status: "not_found" };
    }

    return {
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      attempts: payment.attempts,
      lastAttemptAt: payment.lastAttemptAt,
      canRetry: payment.status === "failed" && payment.attempts < MAX_RETRY_ATTEMPTS,
    };
  }

  return {
    processPayment,
    retryPayment,
    refundPayment,
    getPayment,
    getPaymentStatus,
    calculateFees,
    calculateTax,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    handleBillingCycle,
    calculateProration,
    getSubscription,
    recordRevenueEvent,
    getPaymentHistory,
    calculateMRR,
    calculateARR,
    generateRevenueReport,
  };
}
