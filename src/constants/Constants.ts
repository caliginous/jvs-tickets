export const EVENT_SELECTION_KEY = "event_selection";

export const SEAT_COLORS = {
    normal: "#59bb59",
    active: "#5959bb",
    occupied: "#FF2222"
};

export enum Options {
    ShopTitle = "shop.title",
    ShopSubtitle = "shop.subtitle",
    ImpressUrl = "shop.impress",
    PaymentProviders = "shop.payment-provider",
    Delivery = "shop.delivery",
    Theme = "shop.theme",
    PaymentDetails = "payment.information",
    TaxAmount = "payment.tax-amount",
    PaymentFeesShipping = "payment.fees.shipping",
    PaymentFeesPayment = "payment.fees.payment",
    TemplateInvoice = "template.invoice",
    TemplateConfirmEmail = "template.confirm-email",
    TemplateCancellationEmail = "template.cancellation-email",
    TemplateTicket = "template.ticket",
    TemplatePaymentLink = "template.payment-link",
    InvoiceNumber = "payment.invoice-number",
    GTC = "payment.gtc",
    Privacy = "payment.privacy",
    Currency = "payment.currency",
    // Email Common Settings
    EmailSupportEmail = "email.support-email",
    EmailAppName = "email.app-name",
    EmailAppUrl = "email.app-url",
    EmailSenderName = "email.sender-name"
}

export const OptionLabels: Partial<Record<Options, string>> = {
    "template.invoice": "Template Invoice",
    "template.confirm-email": "Template Confirmation Email",
    "template.ticket": "Template Ticket",
    "template.cancellation-email": "Template Cancellation Confirm E-Mail",
    "template.payment-link": "Template Payment Link Email",
    // Email Common Settings
    "email.support-email": "Support Email",
    "email.app-name": "Application Name",
    "email.app-url": "Application URL",
    "email.sender-name": "Sender Name"
}
