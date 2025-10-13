/**
 * Email Adapter Interface
 * Defines the contract for email sending operations
 */
export class IEmailAdapter {
  /**
   * Initialize the email adapter
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Send an email
   * @param {Object} emailData - Email data
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.html - HTML content
   * @param {string} emailData.text - Plain text content
   * @param {string} emailData.from - Sender email (optional)
   * @returns {Promise<Object>} Result with messageId and success status
   */
  async sendEmail(emailData) {
    throw new Error('Method sendEmail() must be implemented');
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>}
   */
  async verify() {
    throw new Error('Method verify() must be implemented');
  }

  /**
   * Check if initialized
   * @returns {boolean}
   */
  isInitialized() {
    throw new Error('Method isInitialized() must be implemented');
  }
}
