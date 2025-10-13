import nodemailer from 'nodemailer';
import { logger } from './logger.js';
import { SMTP_CONFIG } from '../config/constants.js';

let transporter = null;

export const initMailer = async () => {
  try {
    let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    let port = parseInt(process.env.SMTP_PORT) || 587;
    let secure = process.env.SMTP_SECURE === 'true';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    const maskedUser = user ? `${user.substring(0, 3)}***${user.substring(user.indexOf('@'))}` : 'undefined';
    logger.info('Initializing mailer with config', { host, port, secure, user: maskedUser });

    if (!user || !pass) {
      logger.warn('SMTP_USER or SMTP_PASS not configured');
    }

    const allowFallback = SMTP_CONFIG.FALLBACK_ETHEREAL;

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    try {
      await transporter.verify();
      const maskedUser = user ? user.substring(0, 3) + '***' + user.substring(user.indexOf('@')) : 'unknown';
      logger.info('SMTP connection verified successfully', { host, port, user: maskedUser });
    } catch (verifyErr) {
      logger.error('SMTP verification failed', { error: verifyErr.message });

      if (allowFallback) {
        logger.warn('Falling back to Ethereal test account');
        const testAccount = await nodemailer.createTestAccount();
        host = 'smtp.ethereal.email';
        port = 587;
        secure = false;
        user = testAccount.user;
        pass = testAccount.pass;
        transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.verify();
        logger.info('Fallback Ethereal transport verified');
        logger.info('View test emails at: https://ethereal.email/messages');
      } else {
        throw verifyErr;
      }
    }
  } catch (error) {
    logger.error('Mailer initialization failed', { error: error?.message || error });
    throw error;
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!transporter) {
      logger.error('Cannot send email - transporter not initialized');
      throw new Error('Mailer not initialized. Please check SMTP configuration.');
    }

    const mailOptions = {
      from: SMTP_CONFIG.FROM,
      to,
      subject,
      html: html || text,
      text: text || html
    };

    logger.info('Sending email', { to, subject });

    const info = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info);

    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to,
      subject,
      preview: previewUrl || 'N/A'
    });

    if (previewUrl) {
      logger.info('Email preview URL', { url: previewUrl });
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };

  } catch (error) {
    logger.error('Email sending failed', { error: error?.message || error, to, subject });
    throw new Error('Failed to send email: ' + error.message);
  }
};
