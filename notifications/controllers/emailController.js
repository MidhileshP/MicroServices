import { sendEmail } from '../utils/mailer.js';

export const sendEmailHandler = async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, subject, and (html or text)'
      });
    }

    const result = await sendEmail({ to, subject, html, text });

    return res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Email handler error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email'
    });
  }
};
