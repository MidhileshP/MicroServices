import { sendEmail } from '../utils/mailer.js';
import { logger } from '../utils/logger.js';
import { HTTP_STATUS } from '../config/constants.js';

export const sendEmailHandler = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      logger.warn('Email validation failed - missing required fields', { to, subject });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Missing required fields: to, subject, and (html or text)'
      });
    }

    logger.info('Processing email send request', { to, subject });

    const result = await sendEmail({ to, subject, html, text });

    return res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    logger.error('Email handler error', { error: error.message, to: req.body.to });
    return res.status(HTTP_STATUS.INTERNAL_ERROR).json({
      success: false,
      message: 'Failed to send email'
    });
  }
};
