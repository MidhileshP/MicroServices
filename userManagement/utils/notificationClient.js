import axios from 'axios';

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4000';

export const sendEmail = async (to, subject, html) => {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/email/send`, {
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Failed to send email:', error.message);
    throw new Error('Email delivery failed');
  }
};

export const sendInviteEmail = async (email, inviteToken, inviterName, role) => {
  const inviteLink = `${process.env.FRONTEND_URL}/accept-invite?token=${inviteToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited!</h2>
      <p>Hello,</p>
      <p><strong>${inviterName}</strong> has invited you to join as a <strong>${role}</strong>.</p>
      <p>Click the link below to accept your invitation:</p>
      <p>
        <a href="${inviteLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p>This invitation will expire in 7 days.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(email, 'You have been invited', html);
};

export const sendOTPEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your Verification Code</h2>
      <p>Use the following code to complete your login:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `;

  await sendEmail(email, 'Your verification code', html);
};
