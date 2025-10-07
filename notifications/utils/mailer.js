import nodemailer from 'nodemailer';

let transporter = null;

export const initMailer = async () => {
  try {
    let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
    let port = parseInt(process.env.SMTP_PORT) || 587;
    let secure = process.env.SMTP_SECURE === 'true' || port === 465;
    let user = process.env.SMTP_USER;
    let pass = process.env.SMTP_PASS;
    let default_user="ppoliset2@gitam.in"
    let default_pass="ylxostefogrmwyzh"

    // Developer convenience: auto-create Ethereal test account if not provided
    if (host === 'smtp.ethereal.email' && (!user || !pass)) {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      console.log('[mailer] Using Ethereal test account');
      console.log(`[mailer] Ethereal web UI: https://ethereal.email/messages`);
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: default_user,
        pass: default_pass
      }
    });


    // Verify connection configuration early
    await transporter.verify();
    const maskedUser = user ? user.replace(/.(?=.{3})/g, '*') : undefined;
    console.log('[mailer] Transport verified', { host, port, secure, user: maskedUser });
  } catch (error) {
    console.error('[mailer] Initialization failed:', error?.message || error);
    throw error;
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!transporter) {
      throw new Error('Mailer not initialized');
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || '"User Management System" <noreply@example.com>',
      to,
      subject,
      html: html || text,
      text: text || html
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent:', {
      messageId: info.messageId,
      to,
      subject
    });

    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : undefined;
    return {
      success: true,
      messageId: info.messageId,
      previewUrl
    };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};
