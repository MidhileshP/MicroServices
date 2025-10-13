/**
 * HTTP Client Adapter Interface
 * Defines the contract for HTTP operations
 */
export class IHttpClientAdapter {
  /**
   * Make a GET request
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} Response data
   */
  async get(url, config = {}) {
    throw new Error('Method get() must be implemented');
  }

  /**
   * Make a POST request
   * @param {string} url - Request URL
   * @param {Object} data - Request payload
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} Response data
   */
  async post(url, data, config = {}) {
    throw new Error('Method post() must be implemented');
  }

  /**
   * Make a PUT request
   * @param {string} url - Request URL
   * @param {Object} data - Request payload
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} Response data
   */
  async put(url, data, config = {}) {
    throw new Error('Method put() must be implemented');
  }

  /**
   * Make a PATCH request
   * @param {string} url - Request URL
   * @param {Object} data - Request payload
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} Response data
   */
  async patch(url, data, config = {}) {
    throw new Error('Method patch() must be implemented');
  }

  /**
   * Make a DELETE request
   * @param {string} url - Request URL
   * @param {Object} config - Request configuration
   * @returns {Promise<Object>} Response data
   */
  async delete(url, config = {}) {
    throw new Error('Method delete() must be implemented');
  }

  /**
   * Set default headers
   * @param {Object} headers - Headers object
   */
  setDefaultHeaders(headers) {
    throw new Error('Method setDefaultHeaders() must be implemented');
  }

  /**
   * Set base URL
   * @param {string} baseURL - Base URL
   */
  setBaseURL(baseURL) {
    throw new Error('Method setBaseURL() must be implemented');
  }
}
