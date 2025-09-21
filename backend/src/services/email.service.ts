import * as nodemailer from 'nodemailer';
import type { AlertEmailData } from './alert.service';

// Types for report data
interface WeeklyReportData {
  topEmployees?: Array<{
    name: string;
    hours: number;
    days: number;
  }>;
  totalHours?: number;
  totalEmployees?: number;
  averageHours?: number;
  weekRange?: string;
  activeEmployees?: number;
  alerts?: number;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  /**
   * Initialize email service
   */
  static initialize(): void {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email service not configured - missing SMTP environment variables');
      return;
    }

    const config: EmailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT ?? '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    this.transporter = nodemailer.createTransport(config);

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        console.error('Email service connection error:', error);
      } else {
        console.log('Email service initialized successfully');
      }
    });
  }

  /**
   * Send alert email to managers
   */
  static async sendAlertEmail(
    to: string,
    subject: string,
    alertData: AlertEmailData
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateAlertEmailTemplate(subject, alertData);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Alert email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending alert email:', error);
      return false;
    }
  }

  /**
   * Send weekly report email
   */
  static async sendWeeklyReport(
    to: string,
    companyName: string,
    reportData: WeeklyReportData
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateWeeklyReportTemplate(companyName, reportData);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Weekly report sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending weekly report:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    companyName: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generatePasswordResetTemplate(resetToken, companyName);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Password reset email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(
    to: string,
    userName: string,
    companyName: string,
    tempPassword: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateWelcomeEmailTemplate(userName, companyName, tempPassword);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Welcome email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }

  /**
   * Generate alert email template
   */
  private static generateAlertEmailTemplate(subject: string, alertData: AlertEmailData): EmailTemplate {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .alert-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .actions { background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .button { display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⚠️ ${subject}</h1>
        </div>
        
        <div class="content">
          <div class="alert-info">
            <p><strong>Zamestnanec:</strong> ${alertData.employeeName}</p>
            <p><strong>Firma:</strong> ${alertData.companyName}</p>
            <p><strong>Čas:</strong> ${alertData.timestamp}</p>
            <p><strong>Popis:</strong> ${alertData.description}</p>
            <p><strong>Poloha:</strong> ${alertData.location}</p>
          </div>
          
          <div class="actions">
            <p><strong>Odporúčané akcie:</strong></p>
            <ul>
              <li>Kontaktovať zamestnanca telefonicky</li>
              <li>Skontrolovať dôvod opustenia pracoviska</li>
              <li>Upraviť záznam v systéme ak je potrebné</li>
              <li>Dokumentovať incident pre HR</li>
            </ul>
            
            <p>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}" class="button">
                Otvoriť Dashboard
              </a>
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>Tento email bol automaticky vygenerovaný systémom Dochádzka Pro.</p>
          <p>Pre technickú podporu kontaktujte: ${process.env.SUPPORT_EMAIL ?? 'support@attendance-pro.com'}</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${subject}
      
      Zamestnanec: ${alertData.employeeName}
      Firma: ${alertData.companyName}
      Čas: ${alertData.timestamp}
      Popis: ${alertData.description}
      Poloha: ${alertData.location}
      
      Odporúčané akcie:
      - Kontaktovať zamestnanca telefonicky
      - Skontrolovať dôvod opustenia pracoviska
      - Upraviť záznam v systéme ak je potrebné
      - Dokumentovať incident pre HR
      
      Dashboard: ${process.env.ADMIN_DASHBOARD_URL ?? '#'}
      
      Tento email bol automaticky vygenerovaný systémom Dochádzka Pro.
    `;

    return { subject, html, text };
  }

  /**
   * Generate weekly report email template
   */
  private static generateWeeklyReportTemplate(companyName: string, reportData: WeeklyReportData): EmailTemplate {
    const subject = `Týždenný report - ${companyName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .stats { display: flex; justify-content: space-between; margin: 20px 0; }
          .stat-card { background-color: white; padding: 15px; border-radius: 5px; text-align: center; flex: 1; margin: 0 5px; }
          .stat-number { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          .table th { background-color: #f3f4f6; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Týždenný report</h1>
          <p>${companyName}</p>
        </div>
        
        <div class="content">
          <h2>Prehľad týždňa</h2>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${String(reportData.totalHours ?? 0)}</div>
              <div>Celkové hodiny</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${String(reportData.activeEmployees ?? 0)}</div>
              <div>Aktívni zamestnanci</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${String(reportData.alerts ?? 0)}</div>
              <div>Alerty</div>
            </div>
          </div>
          
          <h3>Top zamestnanci (hodiny)</h3>
          <table class="table">
            <thead>
              <tr>
                <th>Zamestnanec</th>
                <th>Hodiny</th>
                <th>Dni</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.topEmployees?.map((emp) => `
                <tr>
                  <td>${emp.name}</td>
                  <td>${String(emp.hours)}h</td>
                  <td>${String(emp.days)}</td>
                </tr>
              `).join('') ?? '<tr><td colspan="3">Žiadne dáta</td></tr>'}
            </tbody>
          </table>
        </div>
        
        <div class="footer">
          <p>Týždenný report vygenerovaný ${new Date().toLocaleDateString('sk-SK')}</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${subject}
      
      Prehľad týždňa:
      - Celkové hodiny: ${String(reportData.totalHours ?? 0)}
      - Aktívni zamestnanci: ${String(reportData.activeEmployees ?? 0)}
      - Alerty: ${String(reportData.alerts ?? 0)}
      
      Týždenný report vygenerovaný ${new Date().toLocaleDateString('sk-SK')}
    `;

    return { subject, html, text };
  }

  /**
   * Generate password reset email template
   */
  private static generatePasswordResetTemplate(resetToken: string, companyName: string): EmailTemplate {
    const subject = 'Reset hesla - Dochádzka Pro';
    const resetUrl = `${process.env.FRONTEND_URL ?? 'https://app.attendance-pro.com'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .warning { background-color: #fef3cd; border: 1px solid #fadb8a; color: #8a6914; padding: 10px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Reset hesla</h1>
        </div>
        
        <div class="content">
          <p>Dobrý deň,</p>
          
          <p>Dostali sme požiadavku na reset hesla pre váš účet v systéme Dochádzka Pro (${companyName}).</p>
          
          <p>Pre vytvorenie nového hesla kliknite na tlačidlo nižšie:</p>
          
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Resetovať heslo</a>
          </p>
          
          <p>Alebo skopírujte a vložte tento odkaz do prehliadača:</p>
          <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 5px;">
            ${resetUrl}
          </p>
          
          <div class="warning">
            <strong>Upozornenie:</strong> Tento odkaz je platný len 1 hodinu. Ak ste nepožiadali o reset hesla, ignorujte tento email.
          </div>
        </div>
        
        <div class="footer">
          <p>Ak máte problémy s resetom hesla, kontaktujte svojho administrátora.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Reset hesla - Dochádzka Pro
      
      Dobrý deň,
      
      Dostali sme požiadavku na reset hesla pre váš účet v systéme Dochádzka Pro (${companyName}).
      
      Pre vytvorenie nového hesla navštívte: ${resetUrl}
      
      Upozornenie: Tento odkaz je platný len 1 hodinu. Ak ste nepožiadali o reset hesla, ignorujte tento email.
      
      Ak máte problémy s resetom hesla, kontaktujte svojho administrátora.
    `;

    return { subject, html, text };
  }

  /**
   * Generate welcome email template
   */
  private static generateWelcomeEmailTemplate(
    userName: string, 
    companyName: string, 
    tempPassword: string
  ): EmailTemplate {
    const subject = `Vitajte v systéme Dochádzka Pro - ${companyName}`;
    const loginUrl = process.env.FRONTEND_URL ?? 'https://app.attendance-pro.com';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .credentials { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
          .steps { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>👋 Vitajte!</h1>
          <p>Dochádzka Pro - ${companyName}</p>
        </div>
        
        <div class="content">
          <p>Dobrý deň ${userName},</p>
          
          <p>Vitajte v systéme Dochádzka Pro! Váš účet bol úspešne vytvorený.</p>
          
          <div class="credentials">
            <h3>Prihlasovacie údaje:</h3>
            <p><strong>Email:</strong> [váš email]</p>
            <p><strong>Dočasné heslo:</strong> <code>${tempPassword}</code></p>
          </div>
          
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Prihlásiť sa</a>
          </p>
          
          <div class="steps">
            <h3>Prvé kroky:</h3>
            <ol>
              <li>Prihláste sa pomocou údajov vyššie</li>
              <li>Zmeňte si heslo na bezpečnejšie</li>
              <li>Stiahnite si mobilnú aplikáciu</li>
              <li>Povoľte potrebné oprávnenia (poloha, kamera)</li>
              <li>Otestujte si pipnutie pomocou QR kódu</li>
            </ol>
          </div>
          
          <p><strong>Dôležité:</strong> Z bezpečnostných dôvodov si prosím zmeňte heslo pri prvom prihlásení.</p>
        </div>
        
        <div class="footer">
          <p>Ak potrebujete pomoc, kontaktujte svojho administrátora alebo IT podporu.</p>
          <p>Podpora: ${process.env.SUPPORT_EMAIL ?? 'support@attendance-pro.com'}</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${subject}
      
      Dobrý deň ${userName},
      
      Vitajte v systéme Dochádzka Pro! Váš účet bol úspešne vytvorený.
      
      Prihlasovacie údaje:
      Email: [váš email]
      Dočasné heslo: ${tempPassword}
      
      Prihlásenie: ${loginUrl}
      
      Prvé kroky:
      1. Prihláste sa pomocou údajov vyššie
      2. Zmeňte si heslo na bezpečnejšie
      3. Stiahnite si mobilnú aplikáciu
      4. Povoľte potrebné oprávnenia (poloha, kamera)
      5. Otestujte si pipnutie pomocou QR kódu
      
      Dôležité: Z bezpečnostných dôvodov si prosím zmeňte heslo pri prvom prihlásení.
      
      Ak potrebujete pomoc, kontaktujte svojho administrátora alebo IT podporu.
    `;

    return { subject, html, text };
  }

  /**
   * Test email configuration
   */
  static async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email service not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('Email service connection test successful');
      return true;
    } catch (error) {
      console.error('Email service connection test failed:', error);
      return false;
    }
  }

  /**
   * Send geofence violation alert email
   */
  static async sendGeofenceViolationEmail(
    to: string,
    employeeName: string,
    companyName: string,
    violationTime: string,
    location: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateGeofenceViolationTemplate(
        employeeName, 
        companyName, 
        violationTime, 
        location
      );
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Geofence violation email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending geofence violation email:', error);
      return false;
    }
  }

  /**
   * Send correction request notification email
   */
  static async sendCorrectionRequestEmail(
    to: string,
    employeeName: string,
    companyName: string,
    correctionDetails: string,
    reason: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateCorrectionRequestTemplate(
        employeeName,
        companyName,
        correctionDetails,
        reason
      );
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Correction request email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending correction request email:', error);
      return false;
    }
  }

  /**
   * Send business trip request notification email
   */
  static async sendBusinessTripRequestEmail(
    to: string,
    employeeName: string,
    companyName: string,
    destination: string,
    purpose: string,
    dates: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateBusinessTripRequestTemplate(
        employeeName,
        companyName,
        destination,
        purpose,
        dates
      );
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Business trip request email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending business trip request email:', error);
      return false;
    }
  }

  /**
   * Send missing clock out notification email
   */
  static async sendMissingClockOutEmail(
    to: string,
    employeeName: string,
    companyName: string,
    clockInTime: string
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const template = this.generateMissingClockOutTemplate(
        employeeName,
        companyName,
        clockInTime
      );
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Missing clock out email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending missing clock out email:', error);
      return false;
    }
  }

  /**
   * Generate geofence violation email template
   */
  private static generateGeofenceViolationTemplate(
    employeeName: string,
    companyName: string,
    violationTime: string,
    location: string
  ): EmailTemplate {
    const subject = `🚨 Geofence Alert - ${employeeName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .alert-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .actions { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin-top: 20px; border: 1px solid #fecaca; }
          .button { display: inline-block; background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px 0; }
          .urgent { color: #dc2626; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 URGENT - Geofence Alert</h1>
        </div>
        
        <div class="content">
          <div class="alert-info">
            <p class="urgent">ZAMESTNANEC OPUSTIL PRACOVISKO BEZ ODPIPNUTIA!</p>
            <p><strong>Zamestnanec:</strong> ${employeeName}</p>
            <p><strong>Firma:</strong> ${companyName}</p>
            <p><strong>Čas porušenia:</strong> ${violationTime}</p>
            <p><strong>Posledná známa poloha:</strong> ${location}</p>
            <p><strong>Status:</strong> <span style="color: #dc2626;">Stále prihlásený v systéme</span></p>
          </div>
          
          <div class="actions">
            <p><strong>⚡ OKAMŽITÉ AKCIE POTREBNÉ:</strong></p>
            <ul>
              <li><strong>Kontaktovať zamestnanca OKAMŽITE</strong> - telefón, SMS</li>
              <li>Overiť dôvod opustenia pracoviska</li>
              <li>Skontrolovať či sa jedná o núdzovú situáciu</li>
              <li>Odpipnúť zamestnanca ak je to oprávnené</li>
              <li>Dokumentovať incident pre HR záznam</li>
            </ul>
            
            <p>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}" class="button">
                📍 Zobraziť na mape
              </a>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/employees/${employeeName}" class="button">
                👤 Detail zamestnanca
              </a>
            </p>
          </div>
          
          <p><strong>Poznámka:</strong> Tento alert bol vygenerovaný automaticky keď zamestnanec opustil definovanú pracovnú zónu bez odpipnutia sa zo systému.</p>
        </div>
        
        <div class="footer">
          <p>Automatický alert z Dochádzka Pro - ${new Date().toLocaleString('sk-SK')}</p>
          <p>Pre technickú podporu: ${process.env.SUPPORT_EMAIL ?? 'support@attendance-pro.com'}</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      🚨 URGENT - Geofence Alert
      
      ZAMESTNANEC OPUSTIL PRACOVISKO BEZ ODPIPNUTIA!
      
      Zamestnanec: ${employeeName}
      Firma: ${companyName}
      Čas porušenia: ${violationTime}
      Posledná známa poloha: ${location}
      Status: Stále prihlásený v systéme
      
      ⚡ OKAMŽITÉ AKCIE POTREBNÉ:
      - Kontaktovať zamestnanca OKAMŽITE - telefón, SMS
      - Overiť dôvod opustenia pracoviska
      - Skontrolovať či sa jedná o núdzovú situáciu
      - Odpipnúť zamestnanca ak je to oprávnené
      - Dokumentovať incident pre HR záznam
      
      Dashboard: ${process.env.ADMIN_DASHBOARD_URL ?? '#'}
      
      Poznámka: Tento alert bol vygenerovaný automaticky keď zamestnanec opustil definovanú pracovnú zónu bez odpipnutia sa zo systému.
      
      Automatický alert z Dochádzka Pro - ${new Date().toLocaleString('sk-SK')}
    `;

    return { subject, html, text };
  }

  /**
   * Generate correction request email template
   */
  private static generateCorrectionRequestTemplate(
    employeeName: string,
    companyName: string,
    correctionDetails: string,
    reason: string
  ): EmailTemplate {
    const subject = `📝 Nová požiadavka na korekciu - ${employeeName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .request-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .reason-box { background-color: #fffbeb; padding: 15px; border-radius: 5px; margin: 15px 0; border: 1px solid #fed7aa; }
          .actions { background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .button { display: inline-block; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }
          .approve-btn { background-color: #10b981; }
          .reject-btn { background-color: #ef4444; }
          .review-btn { background-color: #3b82f6; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 Nová požiadavka na korekciu</h1>
        </div>
        
        <div class="content">
          <div class="request-info">
            <p><strong>Zamestnanec:</strong> ${employeeName}</p>
            <p><strong>Firma:</strong> ${companyName}</p>
            <p><strong>Čas požiadavky:</strong> ${new Date().toLocaleString('sk-SK')}</p>
            <p><strong>Požadovaná zmena:</strong></p>
            <div style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; margin: 10px 0;">
              ${correctionDetails}
            </div>
          </div>
          
          <div class="reason-box">
            <p><strong>Dôvod korekcie:</strong></p>
            <p style="font-style: italic;">"${reason}"</p>
          </div>
          
          <div class="actions">
            <p><strong>Akcie:</strong></p>
            <p>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/corrections" class="button approve-btn">
                ✅ Schváliť
              </a>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/corrections" class="button reject-btn">
                ❌ Zamietnuť
              </a>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/corrections" class="button review-btn">
                👁️ Preskúmať
              </a>
            </p>
          </div>
          
          <p><strong>Poznámka:</strong> Korekcie by mali byť spracované do 24 hodín od podania.</p>
        </div>
        
        <div class="footer">
          <p>Automatická notifikácia z Dochádzka Pro</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      📝 Nová požiadavka na korekciu
      
      Zamestnanec: ${employeeName}
      Firma: ${companyName}
      Čas požiadavky: ${new Date().toLocaleString('sk-SK')}
      
      Požadovaná zmena:
      ${correctionDetails}
      
      Dôvod korekcie:
      "${reason}"
      
      Dashboard: ${process.env.ADMIN_DASHBOARD_URL ?? '#'}/corrections
      
      Poznámka: Korekcie by mali byť spracované do 24 hodín od podania.
    `;

    return { subject, html, text };
  }

  /**
   * Generate business trip request email template
   */
  private static generateBusinessTripRequestTemplate(
    employeeName: string,
    companyName: string,
    destination: string,
    purpose: string,
    dates: string
  ): EmailTemplate {
    const subject = `✈️ Nová služobná cesta - ${employeeName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .trip-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #3b82f6; }
          .actions { background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .button { display: inline-block; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px; }
          .approve-btn { background-color: #10b981; }
          .reject-btn { background-color: #ef4444; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✈️ Požiadavka na služobnú cestu</h1>
        </div>
        
        <div class="content">
          <div class="trip-info">
            <p><strong>Zamestnanec:</strong> ${employeeName}</p>
            <p><strong>Firma:</strong> ${companyName}</p>
            <p><strong>Destinácia:</strong> ${destination}</p>
            <p><strong>Účel cesty:</strong> ${purpose}</p>
            <p><strong>Termín:</strong> ${dates}</p>
            <p><strong>Čas požiadavky:</strong> ${new Date().toLocaleString('sk-SK')}</p>
          </div>
          
          <div class="actions">
            <p><strong>Rozhodnutie:</strong></p>
            <p>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/business-trips" class="button approve-btn">
                ✅ Schváliť cestu
              </a>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/business-trips" class="button reject-btn">
                ❌ Zamietnuť cestu
              </a>
            </p>
          </div>
          
          <p><strong>Poznámka:</strong> Po schválení bude zamestnanec môcť začať služobnú cestu a systém bude sledovať jeho polohu počas cesty.</p>
        </div>
        
        <div class="footer">
          <p>Automatická notifikácia z Dochádzka Pro</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ✈️ Požiadavka na služobnú cestu
      
      Zamestnanec: ${employeeName}
      Firma: ${companyName}
      Destinácia: ${destination}
      Účel cesty: ${purpose}
      Termín: ${dates}
      Čas požiadavky: ${new Date().toLocaleString('sk-SK')}
      
      Dashboard: ${process.env.ADMIN_DASHBOARD_URL ?? '#'}/business-trips
      
      Poznámka: Po schválení bude zamestnanec môcť začať služobnú cestu a systém bude sledovať jeho polohu počas cesty.
    `;

    return { subject, html, text };
  }

  /**
   * Generate missing clock out email template
   */
  private static generateMissingClockOutTemplate(
    employeeName: string,
    companyName: string,
    clockInTime: string
  ): EmailTemplate {
    const subject = `⏰ Chýba odpipnutie - ${employeeName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .warning-info { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          .actions { background-color: #fefce8; padding: 15px; border-radius: 5px; margin-top: 20px; border: 1px solid #fde047; }
          .button { display: inline-block; background-color: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 5px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>⏰ Chýbajúce odpipnutie</h1>
        </div>
        
        <div class="content">
          <div class="warning-info">
            <p><strong>Zamestnanec:</strong> ${employeeName}</p>
            <p><strong>Firma:</strong> ${companyName}</p>
            <p><strong>Čas pripnutia:</strong> ${clockInTime}</p>
            <p><strong>Status:</strong> <span style="color: #f59e0b;">Stále prihlásený</span></p>
            <p><strong>Detekované:</strong> ${new Date().toLocaleString('sk-SK')}</p>
          </div>
          
          <div class="actions">
            <p><strong>Možné dôvody:</strong></p>
            <ul>
              <li>Zamestnanec zabudol sa odpipnúť</li>
              <li>Technický problém s aplikáciou</li>
              <li>Práca mimo štandardných hodín</li>
              <li>Núdzová situácia</li>
            </ul>
            
            <p><strong>Odporúčané akcie:</strong></p>
            <ul>
              <li>Kontaktovať zamestnanca</li>
              <li>Overiť skutočný čas odchodu</li>
              <li>Manuálne odpipnúť ak je potrebné</li>
              <li>Vytvoriť korekciu času</li>
            </ul>
            
            <p>
              <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}" class="button">
                📊 Otvoriť Dashboard
              </a>
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p>Automatická kontrola z Dochádzka Pro</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      ⏰ Chýbajúce odpipnutie
      
      Zamestnanec: ${employeeName}
      Firma: ${companyName}
      Čas pripnutia: ${clockInTime}
      Status: Stále prihlásený
      Detekované: ${new Date().toLocaleString('sk-SK')}
      
      Možné dôvody:
      - Zamestnanec zabudol sa odpipnúť
      - Technický problém s aplikáciou
      - Práca mimo štandardných hodín
      - Núdzová situácia
      
      Odporúčané akcie:
      - Kontaktovať zamestnanca
      - Overiť skutočný čas odchodu
      - Manuálne odpipnúť ak je potrebné
      - Vytvoriť korekciu času
      
      Dashboard: ${process.env.ADMIN_DASHBOARD_URL ?? '#'}
    `;

    return { subject, html, text };
  }

  /**
   * Send test email
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: 'Test email - Dochádzka Pro',
        html: `
          <h2>Test email</h2>
          <p>Ak vidíte túto správu, email služba funguje správne.</p>
          <p>Čas odoslania: ${new Date().toLocaleString('sk-SK')}</p>
        `,
        text: `
          Test email
          
          Ak vidíte túto správu, email služba funguje správne.
          Čas odoslania: ${new Date().toLocaleString('sk-SK')}
        `,
      });

      console.log(`Test email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending test email:', error);
      return false;
    }
  }

  /**
   * Send correction status email
   */
  static async sendCorrectionStatusEmail(
    to: string,
    data: {
      employeeName: string;
      employeeEmail: string;
      originalEventType: string;
      originalTimestamp: Date;
      requestedChanges: string;
      reason: string;
      reviewNotes?: string;
      decision: 'APPROVED' | 'REJECTED';
      reviewedAt: Date;
      reviewerName: string;
    }
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const subject = data.decision === 'APPROVED' 
        ? `✅ Korekcia schválená - ${data.employeeName}`
        : `❌ Korekcia zamietnutá - ${data.employeeName}`;

      const template = this.generateCorrectionStatusEmailTemplate(data);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Correction status email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending correction status email:', error);
      return false;
    }
  }

  /**
   * Send business trip status email
   */
  static async sendBusinessTripStatusEmail(
    to: string,
    data: {
      employeeName: string;
      employeeEmail: string;
      destination: string;
      purpose: string;
      estimatedStart: Date;
      estimatedEnd: Date;
      notes?: string;
      tripId: string;
      createdAt: Date;
      decision: 'APPROVED' | 'REJECTED';
      reviewNotes?: string;
      reviewedAt: Date;
      reviewerName: string;
    }
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const subject = data.decision === 'APPROVED' 
        ? `✅ Služobná cesta schválená - ${data.employeeName}`
        : `❌ Služobná cesta zamietnutá - ${data.employeeName}`;

      const template = this.generateBusinessTripStatusEmailTemplate(data);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Business trip status email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending business trip status email:', error);
      return false;
    }
  }

  /**
   * Send long break email
   */
  static async sendLongBreakEmail(
    to: string,
    data: {
      employeeName: string;
      breakDuration: number;
      startTime: Date;
      location?: string;
      companyName: string;
    }
  ): Promise<boolean> {
    if (!this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      const subject = `⚠️ Dlhá prestávka - ${data.employeeName}`;
      const template = this.generateLongBreakEmailTemplate(data);
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject,
        html: template.html,
        text: template.text,
      });

      console.log(`Long break email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending long break email:', error);
      return false;
    }
  }

  /**
   * Verify email connection
   */
  static async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection verification failed:', error);
      return false;
    }
  }

  /**
   * Generate correction status email template
   */
  private static generateCorrectionStatusEmailTemplate(data: {
    employeeName: string;
    originalEventType: string;
    originalTimestamp: Date;
    requestedChanges: string;
    reason: string;
    reviewNotes?: string;
    decision: 'APPROVED' | 'REJECTED';
    reviewedAt: Date;
    reviewerName: string;
  }): EmailTemplate {
    const isApproved = data.decision === 'APPROVED';
    const subject = isApproved 
      ? `✅ Korekcia schválená - ${data.employeeName}`
      : `❌ Korekcia zamietnutá - ${data.employeeName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'};">
          ${isApproved ? '✅ Korekcia schválená' : '❌ Korekcia zamietnutá'}
        </h2>
        <p>Dobrý deň ${data.employeeName},</p>
        <p>Vaša žiadosť o korekciu času bola ${isApproved ? 'schválená' : 'zamietnutá'}.</p>
        
        <h3>Detaily korekcie:</h3>
        <ul>
          <li><strong>Typ udalosti:</strong> ${data.originalEventType}</li>
          <li><strong>Pôvodný čas:</strong> ${data.originalTimestamp.toLocaleString('sk-SK')}</li>
          <li><strong>Požadované zmeny:</strong> ${data.requestedChanges}</li>
          <li><strong>Dôvod:</strong> ${data.reason}</li>
        </ul>
        
        ${data.reviewNotes ? `
        <h3>Poznámky manažéra:</h3>
        <p>${data.reviewNotes}</p>
        ` : ''}
        
        <p>Recenzováno: ${data.reviewedAt.toLocaleString('sk-SK')} od ${data.reviewerName}</p>
      </div>
    `;

    const text = `
      ${subject}
      
      Dobrý deň ${data.employeeName},
      
      Vaša žiadosť o korekciu času bola ${isApproved ? 'schválená' : 'zamietnutá'}.
      
      Detaily korekcie:
      - Typ udalosti: ${data.originalEventType}
      - Pôvodný čas: ${data.originalTimestamp.toLocaleString('sk-SK')}
      - Požadované zmeny: ${data.requestedChanges}
      - Dôvod: ${data.reason}
      
      ${data.reviewNotes ? `Poznámky manažéra: ${data.reviewNotes}` : ''}
      
      Recenzováno: ${data.reviewedAt.toLocaleString('sk-SK')} od ${data.reviewerName}
    `;

    return { subject, html, text };
  }

  /**
   * Generate business trip status email template
   */
  private static generateBusinessTripStatusEmailTemplate(data: {
    destination: string;
    purpose: string;
    estimatedStart: Date;
    estimatedEnd: Date;
    notes?: string;
    decision: 'APPROVED' | 'REJECTED';
    reviewNotes?: string;
    reviewedAt: Date;
    reviewerName: string;
  }): EmailTemplate {
    const isApproved = data.decision === 'APPROVED';
    const subject = isApproved 
      ? `✅ Služobná cesta schválená`
      : `❌ Služobná cesta zamietnutá`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isApproved ? '#10b981' : '#ef4444'};">
          ${isApproved ? '✅ Služobná cesta schválená' : '❌ Služobná cesta zamietnutá'}
        </h2>
        
        <h3>Detaily služobnej cesty:</h3>
        <ul>
          <li><strong>Destinácia:</strong> ${data.destination}</li>
          <li><strong>Účel:</strong> ${data.purpose}</li>
          <li><strong>Začiatok:</strong> ${data.estimatedStart.toLocaleString('sk-SK')}</li>
          <li><strong>Koniec:</strong> ${data.estimatedEnd.toLocaleString('sk-SK')}</li>
        </ul>
        
        ${data.reviewNotes ? `
        <h3>Poznámky manažéra:</h3>
        <p>${data.reviewNotes}</p>
        ` : ''}
        
        <p>Recenzováno: ${data.reviewedAt.toLocaleString('sk-SK')} od ${data.reviewerName}</p>
      </div>
    `;

    const text = `
      ${subject}
      
      Detaily služobnej cesty:
      - Destinácia: ${data.destination}
      - Účel: ${data.purpose}
      - Začiatok: ${data.estimatedStart.toLocaleString('sk-SK')}
      - Koniec: ${data.estimatedEnd.toLocaleString('sk-SK')}
      
      ${data.reviewNotes ? `Poznámky manažéra: ${data.reviewNotes}` : ''}
      
      Recenzováno: ${data.reviewedAt.toLocaleString('sk-SK')} od ${data.reviewerName}
    `;

    return { subject, html, text };
  }

  /**
   * Generate long break email template
   */
  private static generateLongBreakEmailTemplate(data: {
    employeeName: string;
    breakDuration: number;
    startTime: Date;
    location?: string;
    companyName: string;
  }): EmailTemplate {
    const subject = `⚠️ Dlhá prestávka - ${data.employeeName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Dlhá prestávka</h2>
        
        <p>Zamestnanec ${data.employeeName} má dlhú prestávku.</p>
        
        <h3>Detaily:</h3>
        <ul>
          <li><strong>Dĺžka prestávky:</strong> ${data.breakDuration} minút</li>
          <li><strong>Začiatok:</strong> ${data.startTime.toLocaleString('sk-SK')}</li>
          ${data.location ? `<li><strong>Poloha:</strong> ${data.location}</li>` : ''}
        </ul>
      </div>
    `;

    const text = `
      ${subject}
      
      Zamestnanec ${data.employeeName} má dlhú prestávku.
      
      Detaily:
      - Dĺžka prestávky: ${data.breakDuration} minút
      - Začiatok: ${data.startTime.toLocaleString('sk-SK')}
      ${data.location ? `- Poloha: ${data.location}` : ''}
    `;

    return { subject, html, text };
  }

  /**
   * Send correction request email to managers
   */
  async sendCorrectionRequestEmail(to: string, data: {
    employeeName: string;
    employeeEmail: string;
    originalEventType: string;
    originalTimestamp: Date;
    requestedChanges: string;
    reason: string;
    correctionId: string;
    createdAt: Date;
  }): Promise<void> {
    if (!EmailService.transporter) {
      console.warn('Email service not configured');
      return;
    }

    try {
      await EmailService.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: `📝 Nová korekcia od ${data.employeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0; font-size: 24px;">📝 Nová korekcia času</h1>
                <p style="color: #6b7280; margin: 10px 0 0 0;">Požiadavka na schválenie</p>
              </div>

              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 25px;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚠️ Vyžaduje vašu pozornosť</h3>
                <p style="color: #92400e; margin: 0; font-size: 14px;">Zamestnanec požiadal o korekciu svojho záznamu dochádzky.</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Informácie o zamestnancovi</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Meno:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.employeeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.employeeEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Dátum žiadosti:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.createdAt.toLocaleString('sk-SK')}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Pôvodný záznam</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Typ udalosti:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.originalEventType}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Čas:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.originalTimestamp.toLocaleString('sk-SK')}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Požadované zmeny</h3>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px;">
                  <p style="color: #1f2937; margin: 0; font-family: monospace; font-size: 14px;">${data.requestedChanges}</p>
                </div>
              </div>

              <div style="margin-bottom: 30px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Dôvod korekcie</h3>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; margin: 0; line-height: 1.5;">${data.reason}</p>
                </div>
              </div>

              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/corrections/${data.correctionId}" 
                   style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 0 10px;">
                  📊 Zobraziť v dashboarde
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Tento email bol odoslaný automaticky systémom Dochádzka Pro.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
          NOVÁ KOREKCIA ČASU
          
          Zamestnanec: ${data.employeeName} (${data.employeeEmail})
          Dátum žiadosti: ${data.createdAt.toLocaleString('sk-SK')}
          
          PÔVODNÝ ZÁZNAM:
          Typ: ${data.originalEventType}
          Čas: ${data.originalTimestamp.toLocaleString('sk-SK')}
          
          POŽADOVANÉ ZMENY:
          ${data.requestedChanges}
          
          DÔVOD KOREKCIE:
          ${data.reason}
          
          Pre schválenie alebo zamietnutie navštívte admin dashboard:
          ${process.env.ADMIN_DASHBOARD_URL ?? '#'}/corrections/${data.correctionId}
        `,
      });

      console.log(`Correction request email sent to ${to}`);
    } catch (error) {
      console.error('Error sending correction request email:', error);
      throw error;
    }
  }

  /**
   * Send correction decision email to employee
   */
  async sendCorrectionDecisionEmail(to: string, data: {
    employeeName: string;
    decision: 'APPROVED' | 'REJECTED';
    originalEventType: string;
    originalTimestamp: Date;
    requestedChanges: string;
    reason: string;
    reviewNotes?: string;
    reviewedAt: Date;
    reviewerName: string;
  }): Promise<void> {
    if (!EmailService.transporter) {
      console.warn('Email service not configured');
      return;
    }

    const isApproved = data.decision === 'APPROVED';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusIcon = isApproved ? '✅' : '❌';
    const statusText = isApproved ? 'SCHVÁLENÁ' : 'ZAMIETNUTÁ';

    try {
      await EmailService.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: `${statusIcon} Korekcia ${isApproved ? 'schválená' : 'zamietnutá'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: ${statusColor}; margin: 0; font-size: 24px;">${statusIcon} Korekcia ${statusText}</h1>
                <p style="color: #6b7280; margin: 10px 0 0 0;">Rozhodnutie o vašej požiadavke</p>
              </div>

              <div style="background-color: ${isApproved ? '#d1fae5' : '#fee2e2'}; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin-bottom: 25px;">
                <h3 style="color: ${isApproved ? '#065f46' : '#991b1b'}; margin: 0 0 10px 0; font-size: 16px;">
                  ${isApproved ? '✅ Vaša korekcia bola schválená' : '❌ Vaša korekcia bola zamietnutá'}
                </h3>
                <p style="color: ${isApproved ? '#065f46' : '#991b1b'}; margin: 0; font-size: 14px;">
                  ${isApproved 
                    ? 'Zmeny boli aplikované na váš záznam dochádzky.'
                    : 'Vaša požiadavka nebola schválená. Pozrite si dôvod nižšie.'}
                </p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Informácie o rozhodnutí</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Rozhodol:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.reviewerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Dátum rozhodnutia:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.reviewedAt.toLocaleString('sk-SK')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Stav:</td>
                    <td style="padding: 8px 0; color: ${statusColor}; font-weight: 600;">${statusText}</td>
                  </tr>
                </table>
              </div>

              ${data.reviewNotes ? `
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
                    ${isApproved ? 'Poznámky manažéra' : 'Dôvod zamietnutia'}
                  </h3>
                  <div style="background-color: ${isApproved ? '#eff6ff' : '#fef2f2'}; padding: 15px; border-radius: 6px; border: 1px solid ${isApproved ? '#dbeafe' : '#fecaca'};">
                    <p style="color: ${isApproved ? '#1e40af' : '#dc2626'}; margin: 0; line-height: 1.5;">${data.reviewNotes}</p>
                  </div>
                </div>
              ` : ''}

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Tento email bol odoslaný automaticky systémom Dochádzka Pro.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
          KOREKCIA ${statusText}
          
          Vaša korekcia času bola ${isApproved ? 'schválená' : 'zamietnutá'}.
          
          ROZHODOL: ${data.reviewerName}
          DÁTUM ROZHODNUTIA: ${data.reviewedAt.toLocaleString('sk-SK')}
          
          ${data.reviewNotes ? `
          ${isApproved ? 'POZNÁMKY MANAŽÉRA' : 'DÔVOD ZAMIETNUTIA'}:
          ${data.reviewNotes}
          ` : ''}
          
          ${isApproved ? `
          Zmeny boli aplikované na váš záznam. Môžete si ich pozrieť v aplikácii.
          ` : `
          Ak máte otázky k zamietnutiu, kontaktujte svojho manažéra.
          `}
        `,
      });

      console.log(`Correction decision email sent to ${to}`);
    } catch (error) {
      console.error('Error sending correction decision email:', error);
      throw error;
    }
  }

  /**
   * Send business trip request email to managers
   */
  async sendBusinessTripRequestEmail(to: string, data: {
    employeeName: string;
    employeeEmail: string;
    destination: string;
    purpose: string;
    estimatedStart: Date;
    estimatedEnd: Date;
    notes?: string;
    tripId: string;
    createdAt: Date;
  }): Promise<void> {
    if (!EmailService.transporter) {
      console.warn('Email service not configured');
      return;
    }

    const duration = Math.ceil((data.estimatedEnd.getTime() - data.estimatedStart.getTime()) / (1000 * 60 * 60 * 24));

    try {
      await EmailService.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: `✈️ Nová služobná cesta od ${data.employeeName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1f2937; margin: 0; font-size: 24px;">✈️ Nová služobná cesta</h1>
                <p style="color: #6b7280; margin: 10px 0 0 0;">Požiadavka na schválenie</p>
              </div>

              <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-bottom: 25px;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px;">📋 Vyžaduje vašu pozornosť</h3>
                <p style="color: #1e40af; margin: 0; font-size: 14px;">Zamestnanec požiadal o schválenie služobnej cesty.</p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Informácie o zamestnancovi</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Meno:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.employeeName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Email:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.employeeEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Dátum žiadosti:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.createdAt.toLocaleString('sk-SK')}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Detaily služobnej cesty</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destinácia:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${data.destination}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Začiatok:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.estimatedStart.toLocaleString('sk-SK')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Koniec:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.estimatedEnd.toLocaleString('sk-SK')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Trvanie:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${String(duration)} ${duration === 1 ? 'deň' : duration < 5 ? 'dni' : 'dní'}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Účel cesty</h3>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; margin: 0; line-height: 1.5;">${data.purpose}</p>
                </div>
              </div>

              ${data.notes ? `
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Dodatočné poznámky</h3>
                  <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px;">
                    <p style="color: #1f2937; margin: 0; line-height: 1.5;">${data.notes}</p>
                  </div>
                </div>
              ` : ''}

              <div style="text-align: center; margin-bottom: 25px;">
                <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/business-trips/${data.tripId}" 
                   style="display: inline-block; background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 0 10px;">
                  ✅ Schváliť
                </a>
                <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}/business-trips/${data.tripId}" 
                   style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 0 10px;">
                  ❌ Zamietnuť
                </a>
              </div>

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Tento email bol odoslaný automaticky systémom Dochádzka Pro.<br>
                  Pre správu služobných ciest navštívte <a href="${process.env.ADMIN_DASHBOARD_URL ?? '#'}" style="color: #3b82f6;">admin dashboard</a>.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
          NOVÁ SLUŽOBNÁ CESTA
          
          Zamestnanec: ${data.employeeName} (${data.employeeEmail})
          Dátum žiadosti: ${data.createdAt.toLocaleString('sk-SK')}
          
          DETAILY CESTY:
          Destinácia: ${data.destination}
          Začiatok: ${data.estimatedStart.toLocaleString('sk-SK')}
          Koniec: ${data.estimatedEnd.toLocaleString('sk-SK')}
          Trvanie: ${String(duration)} ${duration === 1 ? 'deň' : duration < 5 ? 'dni' : 'dní'}
          
          ÚČEL CESTY:
          ${data.purpose}
          
          ${data.notes ? `
          POZNÁMKY:
          ${data.notes}
          ` : ''}
          
          Pre schválenie alebo zamietnutie navštívte admin dashboard:
          ${process.env.ADMIN_DASHBOARD_URL ?? '#'}/business-trips/${data.tripId}
        `,
      });

      console.log(`Business trip request email sent to ${to}`);
    } catch (error) {
      console.error('Error sending business trip request email:', error);
      throw error;
    }
  }

  /**
   * Send business trip decision email to employee
   */
  async sendBusinessTripDecisionEmail(to: string, data: {
    employeeName: string;
    decision: 'APPROVED' | 'REJECTED';
    destination: string;
    purpose: string;
    estimatedStart: Date;
    estimatedEnd: Date;
    notes?: string;
    reviewNotes?: string;
    reviewedAt: Date;
    reviewerName: string;
  }): Promise<void> {
    if (!EmailService.transporter) {
      console.warn('Email service not configured');
      return;
    }

    const isApproved = data.decision === 'APPROVED';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusIcon = isApproved ? '✅' : '❌';
    const statusText = isApproved ? 'SCHVÁLENÁ' : 'ZAMIETNUTÁ';
    const duration = Math.ceil((data.estimatedEnd.getTime() - data.estimatedStart.getTime()) / (1000 * 60 * 60 * 24));

    try {
      await EmailService.transporter.sendMail({
        from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
        to,
        subject: `${statusIcon} Služobná cesta ${isApproved ? 'schválená' : 'zamietnutá'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: ${statusColor}; margin: 0; font-size: 24px;">${statusIcon} Služobná cesta ${statusText}</h1>
                <p style="color: #6b7280; margin: 10px 0 0 0;">Rozhodnutie o vašej požiadavke</p>
              </div>

              <div style="background-color: ${isApproved ? '#d1fae5' : '#fee2e2'}; padding: 20px; border-radius: 8px; border-left: 4px solid ${statusColor}; margin-bottom: 25px;">
                <h3 style="color: ${isApproved ? '#065f46' : '#991b1b'}; margin: 0 0 10px 0; font-size: 16px;">
                  ${isApproved ? '✅ Vaša služobná cesta bola schválená' : '❌ Vaša služobná cesta bola zamietnutá'}
                </h3>
                <p style="color: ${isApproved ? '#065f46' : '#991b1b'}; margin: 0; font-size: 14px;">
                  ${isApproved 
                    ? 'Môžete začať prípravu na cestu podľa schváleného plánu.'
                    : 'Vaša požiadavka nebola schválená. Pozrite si dôvod nižšie.'}
                </p>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Informácie o rozhodnutí</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Rozhodol:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.reviewerName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Dátum rozhodnutia:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.reviewedAt.toLocaleString('sk-SK')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Stav:</td>
                    <td style="padding: 8px 0; color: ${statusColor}; font-weight: 600;">${statusText}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Detaily služobnej cesty</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Destinácia:</td>
                    <td style="padding: 8px 0; color: #1f2937; font-weight: 600;">${data.destination}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Začiatok:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.estimatedStart.toLocaleString('sk-SK')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Koniec:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${data.estimatedEnd.toLocaleString('sk-SK')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-weight: 500;">Trvanie:</td>
                    <td style="padding: 8px 0; color: #1f2937;">${String(duration)} ${duration === 1 ? 'deň' : duration < 5 ? 'dni' : 'dní'}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Účel cesty</h3>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
                  <p style="color: #374151; margin: 0; line-height: 1.5;">${data.purpose}</p>
                </div>
              </div>

              ${data.reviewNotes ? `
                <div style="margin-bottom: 30px;">
                  <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">
                    ${isApproved ? 'Poznámky manažéra' : 'Dôvod zamietnutia'}
                  </h3>
                  <div style="background-color: ${isApproved ? '#eff6ff' : '#fef2f2'}; padding: 15px; border-radius: 6px; border: 1px solid ${isApproved ? '#dbeafe' : '#fecaca'};">
                    <p style="color: ${isApproved ? '#1e40af' : '#dc2626'}; margin: 0; line-height: 1.5;">${data.reviewNotes}</p>
                  </div>
                </div>
              ` : ''}

              ${isApproved ? `
                <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                  <h3 style="color: #0369a1; margin: 0 0 10px 0; font-size: 16px;">📝 Ďalšie kroky</h3>
                  <ul style="color: #0369a1; margin: 10px 0 0 20px; padding: 0;">
                    <li>Pripravte si potrebné dokumenty a materiály</li>
                    <li>Skontrolujte cestovné pokyny a rozpočet</li>
                    <li>Začnite cestu cez aplikáciu v deň odchodu</li>
                    <li>Ukončite cestu po návrate</li>
                  </ul>
                </div>
              ` : ''}

              <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Tento email bol odoslaný automaticky systémom Dochádzka Pro.<br>
                  ${!isApproved ? 'Ak máte otázky k zamietnutiu, kontaktujte svojho manažéra.' : ''}
                </p>
              </div>
            </div>
          </div>
        `,
        text: `
          SLUŽOBNÁ CESTA ${statusText}
          
          Vaša služobná cesta do ${data.destination} bola ${isApproved ? 'schválená' : 'zamietnutá'}.
          
          ROZHODOL: ${data.reviewerName}
          DÁTUM ROZHODNUTIA: ${data.reviewedAt.toLocaleString('sk-SK')}
          
          DETAILY CESTY:
          Destinácia: ${data.destination}
          Začiatok: ${data.estimatedStart.toLocaleString('sk-SK')}
          Koniec: ${data.estimatedEnd.toLocaleString('sk-SK')}
          Trvanie: ${String(duration)} ${duration === 1 ? 'deň' : duration < 5 ? 'dni' : 'dní'}
          
          ÚČEL CESTY:
          ${data.purpose}
          
          ${data.reviewNotes ? `
          ${isApproved ? 'POZNÁMKY MANAŽÉRA' : 'DÔVOD ZAMIETNUTIA'}:
          ${data.reviewNotes}
          ` : ''}
          
          ${isApproved ? `
          ĎALŠIE KROKY:
          - Pripravte si potrebné dokumenty a materiály
          - Skontrolujte cestovné pokyny a rozpočet  
          - Začnite cestu cez aplikáciu v deň odchodu
          - Ukončite cestu po návrate
          ` : `
          Ak máte otázky k zamietnutiu, kontaktujte svojho manažéra.
          `}
        `,
      });

      console.log(`Business trip decision email sent to ${to}`);
    } catch (error) {
      console.error('Error sending business trip decision email:', error);
      throw error;
    }
  }
}

// Initialize email service when module is loaded
EmailService.initialize();
