/**
 * Message Queue Adapter Interface
 * Defines the contract for message queue operations
 */
export class IMessageQueueAdapter {
  /**
   * Connect to the message queue
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('Method connect() must be implemented');
  }

  /**
   * Disconnect from the message queue
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  /**
   * Publish a message to an exchange with a routing key
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @param {Object} message - Message payload
   * @param {Object} options - Publishing options
   * @returns {Promise<boolean>}
   */
  async publish(exchange, routingKey, message, options = {}) {
    throw new Error('Method publish() must be implemented');
  }

  /**
   * Subscribe/consume messages from a queue
   * @param {string} queue - Queue name
   * @param {Function} handler - Message handler function
   * @param {Object} options - Subscription options
   * @returns {Promise<void>}
   */
  async subscribe(queue, handler, options = {}) {
    throw new Error('Method subscribe() must be implemented');
  }

  /**
   * Create/assert an exchange
   * @param {string} exchange - Exchange name
   * @param {string} type - Exchange type (topic, direct, fanout, headers)
   * @param {Object} options - Exchange options
   * @returns {Promise<void>}
   */
  async assertExchange(exchange, type, options = {}) {
    throw new Error('Method assertExchange() must be implemented');
  }

  /**
   * Create/assert a queue
   * @param {string} queue - Queue name
   * @param {Object} options - Queue options
   * @returns {Promise<void>}
   */
  async assertQueue(queue, options = {}) {
    throw new Error('Method assertQueue() must be implemented');
  }

  /**
   * Bind a queue to an exchange with a routing key
   * @param {string} queue - Queue name
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @returns {Promise<void>}
   */
  async bindQueue(queue, exchange, routingKey) {
    throw new Error('Method bindQueue() must be implemented');
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    throw new Error('Method isConnected() must be implemented');
  }
}
