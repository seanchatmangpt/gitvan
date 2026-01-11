/**
 * WebSocket Manager
 * Manages WebSocket connections and event broadcasting
 */

let subscribers = new Map();

export class WebSocketManager {
  static subscribe(eventType, callback) {
    if (!subscribers.has(eventType)) {
      subscribers.set(eventType, []);
    }
    subscribers.get(eventType).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = subscribers.get(eventType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  static async broadcast(eventType, data) {
    const callbacks = subscribers.get(eventType) || [];
    const event = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    for (const callback of callbacks) {
      try {
        await callback(event);
      } catch (error) {
        console.error(`Error broadcasting ${eventType}:`, error);
      }
    }
  }

  static async broadcastMultiple(events) {
    const promises = events.map(({ type, data }) =>
      this.broadcast(type, data)
    );
    await Promise.all(promises);
  }

  static getSubscriberCount(eventType) {
    return (subscribers.get(eventType) || []).length;
  }

  static clearAll() {
    subscribers.clear();
  }
}
