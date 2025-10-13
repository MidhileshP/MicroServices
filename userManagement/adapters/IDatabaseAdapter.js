/**
 * Database Adapter Interface
 * Defines the contract for database operations
 */
export class IDatabaseAdapter {
  /**
   * Connect to the database
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('Method connect() must be implemented');
  }

  /**
   * Disconnect from the database
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  /**
   * Check if connection is active
   * @returns {boolean}
   */
  isConnected() {
    throw new Error('Method isConnected() must be implemented');
  }

  /**
   * Get the underlying connection/client
   * @returns {any}
   */
  getConnection() {
    throw new Error('Method getConnection() must be implemented');
  }
}
