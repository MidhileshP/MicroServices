import nodemailer from 'nodemailer';

let transporter = null;

export const initMailer = async () => {
  try {
    let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    let port = parseInt(process.env.SMTP_PORT) || 587; // 587 is STARTTLS for Ethereal; 465 if secure
    let secure = process.env.SMTP_SECURE === 'true' || port === 465;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;

    const allowFallback = (process.env.MAILER_FALLBACK_ETHEREAL || 'true') === 'true';
    const missingCreds = !user || !pass;
    const usingEthereal = !process.env.SMTP_HOST || host === 'smtp.ethereal.email';
    // if (usingEthereal && (missingCreds || process.env.SMTP_HOST === undefined)) {
    //   console.log('[mailer] Using Ethereal test account (no SMTP creds provided).');
    //   const testAccount = await nodemailer.createTestAccount();
    //   host = 'smtp.ethereal.email';
    //   port = 587;
    //   secure = false;
    //   user = testAccount.user;
    //   pass = testAccount.pass;
    //   console.log('[mailer] View emails at: https://ethereal.email/messages');
    // }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user:"mkgupta3004@gmail.com",
        pass:"hfuhfiirdlqhpbuv"
      }
    });

    try {
      await transporter.verify();
    } catch (verifyErr) {
      if (allowFallback) {
        console.warn('[mailer] Primary SMTP verify failed, falling back to Ethereal:', verifyErr?.message || verifyErr);
        const testAccount = await nodemailer.createTestAccount();
        host = 'smtp.ethereal.email';
        port = 587;
        secure = false;
        user = testAccount.user;
        pass = testAccount.pass;
        transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.verify();
        console.log('[mailer] ✓ Fallback Ethereal transport verified');
      } else {
        throw verifyErr;
      }
    }
    const maskedUser = user ? user.substring(0, 3) + '***' + user.substring(user.indexOf('@')) : 'unknown';
    console.log('[mailer] ✓ SMTP connection verified', { host, port, user: maskedUser });
  } catch (error) {
    console.error('[mailer] ✗ Initialization failed:', error?.message || error);
    // Fail fast so the service does not run in a degraded state silently
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

    const info = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log('[mailer] ✓ Email sent:', {
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
    throw new Error('Failed to send email');
  }
};
