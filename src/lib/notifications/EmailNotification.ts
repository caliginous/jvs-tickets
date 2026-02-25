import { NotificationHandler } from "./NotificationHandler";

export class EmailNotification implements NotificationHandler {
    private user: any;
    private data: any;

    constructor(user, data) {
        this.user = user;
        this.data = data;
    }

    async sendNotification(): Promise<void> {
        try {
            const { mailgunService } = await import('../services/mailgunService');
            
            const mailgunResult = await mailgunService.sendEmailWithFallback({
                from: 'JVS Events',
                fromEmail: process.env.EMAIL_SENDER || 'noreply@jvs.org.uk',
                to: this.user.email,
                subject: `Ticketshop - Notification ${this.data.serviceType[0]} ${this.data.serviceType[1]}`,
                html: `Hi ${this.user.userName},<br />You are receiving this email, because you subscribed to E-Mail notifications on your ticket shop.<br /><br />Notification Type: ${this.data.serviceType[0]}<br />Service: ${this.data.serviceType[1]}`,
                replyTo: process.env.EMAIL_SENDER || 'noreply@jvs.org.uk'
            });

            if (!mailgunResult.success) {
                throw new Error(mailgunResult.error || 'Mailgun email failed');
            }

            console.log('✅ [EmailNotification] Email sent successfully via Mailgun:', {
                messageId: mailgunResult.messageId,
                to: this.user.email
            });
        } catch (error) {
            console.error('❌ [EmailNotification] Failed to send email:', error);
            throw error;
        }
    }
}
