/**
 * Cache Adapter Interface
 * Defines the contract for cache operations
 */
export class ICacheAdapter {
  /**
   * Connect to the cache
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('Method connect() must be implemented');
  }

  /**
   * Disconnect from the cache
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('Method disconnect() must be implemented');
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {string} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<void>}
   */
  async set(key, value, ttl = null) {
    throw new Error('Method set() must be implemented');
  }

  /**
   * Delete a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async delete(key) {
    throw new Error('Method delete() must be implemented');
  }

  /**
   * Check if a key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error('Method exists() must be implemented');
  }

  /**
   * Set expiry on a key
   * @param {string} key - Cache key
   * @param {number} seconds - Expiry in seconds
   * @returns {Promise<boolean>}
   */
  async expire(key, seconds) {
    throw new Error('Method expire() must be implemented');
  }

  /**
   * Get multiple values
   * @param {string[]} keys - Array of cache keys
   * @returns {Promise<string[]>}
   */
  async mget(keys) {
    throw new Error('Method mget() must be implemented');
  }

  /**
   * Check if connected
   * @returns {boolean}
   */
  isConnected() {
    throw new Error('Method isConnected() must be implemented');
  }
}
