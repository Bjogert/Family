import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

if (config.email.enabled) {
    transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
            user: config.email.user,
            pass: config.email.password,
        },
    });

    // Verify connection on startup
    transporter.verify((error) => {
        if (error) {
            logger.error('Email service configuration error', { error: error.message });
        } else {
            logger.info('Email service ready');
        }
    });
} else {
    logger.info('Email service disabled (EMAIL_ENABLED not set to true)');
}

interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    if (!transporter) {
        logger.warn('Email not sent - email service is disabled');
        // In development, log the email content
        if (config.isDev) {
            logger.info('Email would have been sent:', {
                to: options.to,
                subject: options.subject,
                text: options.text?.substring(0, 200),
            });
        }
        return false;
    }

    try {
        await transporter.sendMail({
            from: config.email.from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        logger.info(`Email sent to ${options.to}: ${options.subject}`);
        return true;
    } catch (error) {
        logger.error('Failed to send email', { error: error instanceof Error ? error.message : String(error) });
        return false;
    }
}

// Email templates
export async function sendVerificationEmail(email: string, token: string, displayName: string): Promise<boolean> {
    const verifyUrl = `${config.appUrl}/verify-email?token=${token}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #7c3aed; margin: 0; }
        .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 Familjehubben</h1>
        </div>
        <p>Hej ${displayName}!</p>
        <p>Välkommen till Familjehubben! Vänligen bekräfta din e-postadress genom att klicka på knappen nedan:</p>
        <p style="text-align: center;">
          <a href="${verifyUrl}" class="button">Bekräfta e-postadress</a>
        </p>
        <p>Om knappen inte fungerar kan du kopiera och klistra in följande länk i din webbläsare:</p>
        <p style="word-break: break-all; font-size: 12px;">${verifyUrl}</p>
        <p>Länken är giltig i 24 timmar.</p>
        <div class="footer">
          <p>Om du inte har skapat ett konto på Familjehubben kan du ignorera detta mail.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const text = `
Hej ${displayName}!

Välkommen till Familjehubben! Vänligen bekräfta din e-postadress genom att besöka följande länk:

${verifyUrl}

Länken är giltig i 24 timmar.

Om du inte har skapat ett konto på Familjehubben kan du ignorera detta mail.
  `.trim();

    return sendEmail({
        to: email,
        subject: 'Bekräfta din e-postadress - Familjehubben',
        html,
        text,
    });
}

export async function sendPasswordResetEmail(email: string, token: string, displayName: string): Promise<boolean> {
    const resetUrl = `${config.appUrl}/reset-password?token=${token}`;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #7c3aed; margin: 0; }
        .button { display: inline-block; background: #7c3aed; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏠 Familjehubben</h1>
        </div>
        <p>Hej ${displayName}!</p>
        <p>Vi har fått en begäran om att återställa ditt lösenord. Klicka på knappen nedan för att välja ett nytt lösenord:</p>
        <p style="text-align: center;">
          <a href="${resetUrl}" class="button">Återställ lösenord</a>
        </p>
        <p>Om knappen inte fungerar kan du kopiera och klistra in följande länk i din webbläsare:</p>
        <p style="word-break: break-all; font-size: 12px;">${resetUrl}</p>
        <p>Länken är giltig i 1 timme.</p>
        <div class="warning">
          <strong>⚠️ Obs!</strong> Om du inte har begärt att återställa ditt lösenord kan du ignorera detta mail. Ditt lösenord kommer inte att ändras.
        </div>
        <div class="footer">
          <p>Detta är ett automatiskt mail från Familjehubben.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    const text = `
Hej ${displayName}!

Vi har fått en begäran om att återställa ditt lösenord. Besök följande länk för att välja ett nytt lösenord:

${resetUrl}

Länken är giltig i 1 timme.

Om du inte har begärt att återställa ditt lösenord kan du ignorera detta mail. Ditt lösenord kommer inte att ändras.
  `.trim();

    return sendEmail({
        to: email,
        subject: 'Återställ ditt lösenord - Familjehubben',
        html,
        text,
    });
}
