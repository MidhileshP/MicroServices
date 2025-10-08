import nodemailer from 'nodemailer';

let transporter = null;

export const initMailer = async () => {
  try {
    let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    let port = parseInt(process.env.SMTP_PORT) || 587;
    let secure = process.env.SMTP_SECURE === 'true';
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    console.log('[mailer] Initializing with config:', {
      host,
      port,
      secure,
      user: user ? `${user.substring(0, 3)}***${user.substring(user.indexOf('@'))}` : 'undefined'
    });

    if (!user || !pass) {
      console.warn('[mailer] SMTP_USER or SMTP_PASS not configured');
    }

    const allowFallback = (process.env.MAILER_FALLBACK_ETHEREAL || 'true') === 'true';

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
      console.log('[mailer] ✓ SMTP connection verified successfully', { host, port, user: maskedUser });
    } catch (verifyErr) {
      console.error('[mailer] ✗ SMTP verification failed:', verifyErr.message);

      if (allowFallback) {
        console.warn('[mailer] Falling back to Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        host = 'smtp.ethereal.email';
        port = 587;
        secure = false;
        user = testAccount.user;
        pass = testAccount.pass;
        transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.verify();
        console.log('[mailer] ✓ Fallback Ethereal transport verified');
        console.log('[mailer] View test emails at: https://ethereal.email/messages');
      } else {
        throw verifyErr;
      }
    }
  } catch (error) {
    console.error('[mailer] ✗ Initialization failed:', error?.message || error);
    throw error;
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!transporter) {
      console.error('[mailer] Cannot send email - transporter not initialized');
      throw new Error('Mailer not initialized. Please check SMTP configuration.');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"User Management System" <noreply@example.com>',
      to,
      subject,
      html: html || text,
      text: text || html
    };

    console.log('[mailer] Sending email to:', to);

    const info = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('[mailer] ✓ Email sent successfully:', {
      messageId: info.messageId,
      to,
      subject,
      preview: previewUrl || 'N/A'
    });

    if (previewUrl) {
      console.log('[mailer] Preview URL:', previewUrl);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };

  } catch (error) {
    console.error('[mailer] ✗ Email sending failed:', error?.message || error);
    console.error('[mailer] Error details:', error);
    throw new Error('Failed to send email: ' + error.message);
  }
};
