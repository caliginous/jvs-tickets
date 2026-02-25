import { getOption } from '../options';
import { Options } from '../../constants/Constants';

export interface EmailCommonData {
    supportEmail: string;
    appName: string;
    appUrl: string;
    senderName: string;
}

/**
 * Get common email configuration values from the options system
 */
export async function getEmailCommonData(): Promise<EmailCommonData> {
    const supportEmail = await getOption(Options.EmailSupportEmail) || 'support@jvs.org.uk';
    const appName = await getOption(Options.EmailAppName) || 'JVS Events';
    const appUrl = await getOption(Options.EmailAppUrl) || 'https://jvs.org.uk';
    const senderName = await getOption(Options.EmailSenderName) || 'JVS Events';

    return {
        supportEmail,
        appName,
        appUrl,
        senderName
    };
}

/**
 * Get a specific common email value
 */
export async function getEmailCommonValue(key: Options): Promise<string> {
    return await getOption(key) || '';
}
