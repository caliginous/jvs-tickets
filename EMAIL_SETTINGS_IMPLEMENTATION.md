# 📧 Dynamic Email Settings for Static Pages

This system allows you to use database-driven email settings in static pages that are fetched at build time, ensuring your contact information stays up-to-date without runtime database calls.

## 🚀 How It Works

1. **Build Time**: Email settings are fetched from the database when the site is built
2. **Static Generation**: Pages are generated with the current email settings baked in
3. **No Runtime Calls**: Once built, pages serve static content with no database queries
4. **Easy Updates**: Change email settings in the admin panel and rebuild to update all pages

## 📁 Files Created

- `src/lib/getEmailSettings.ts` - Core function to fetch email settings
- `src/lib/staticPageUtils.ts` - Utilities for Pages Router
- `src/lib/appRouterUtils.ts` - Utilities for App Router
- `src/hooks/useEmailSettings.ts` - React hook for client-side usage
- `src/components/examples/EmailSettingsExample.tsx` - Example implementation

## 🔧 Implementation Examples

### For App Router Pages (src/app/)

```tsx
// src/app/contact/page.tsx
import { getEmailSettingsForAppRouter } from '@/lib/appRouterUtils';
import { EmailSettings } from '@/lib/getEmailSettings';

interface ContactPageProps {
  emailSettings: EmailSettings;
}

export default function ContactPage({ emailSettings }: ContactPageProps) {
  return (
    <div>
      <h1>Contact Us</h1>
      <p>Email us at: <a href={`mailto:${emailSettings.supportEmail}`}>
        {emailSettings.supportEmail}
      </a></p>
    </div>
  );
}

// This function runs at build time and fetches email settings
export async function generateStaticParams() {
  const emailSettings = await getEmailSettingsForAppRouter();
  
  // You can also use emailSettings here if needed
  console.log('Building contact page with email:', emailSettings.supportEmail);
  
  return [];
}
```

### For Pages Router (src/pages/)

```tsx
// src/pages/contact.tsx
import { GetStaticProps } from 'next';
import { withEmailSettings, StaticPageProps } from '@/lib/staticPageUtils';
import { EmailSettings } from '@/lib/getEmailSettings';

interface ContactPageProps extends StaticPageProps {
  // Add your other props here
}

export default function ContactPage({ emailSettings }: ContactPageProps) {
  return (
    <div>
      <h1>Contact Us</h1>
      <p>Email us at: <a href={`mailto:${emailSettings.supportEmail}`}>
        {emailSettings.supportEmail}
      </a></p>
    </div>
  );
}

// This automatically adds emailSettings to your props
export const getStaticProps = withEmailSettings();
```

### Using the React Hook (Client-side)

```tsx
// For components that need email settings on the client
import { useEmailSettings } from '@/hooks/useEmailSettings';

export default function ContactForm() {
  const { supportEmail, loading, error } = useEmailSettings();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading contact info</div>;
  
  return (
    <form>
      <p>Need help? Contact us at {supportEmail}</p>
      {/* form content */}
    </form>
  );
}
```

## 🎯 Available Email Settings

The system provides these email addresses and settings:

- `supportEmail` - Main support contact
- `infoEmail` - General information
- `legalEmail` - Legal matters
- `privacyEmail` - Privacy concerns
- `appName` - Application name
- `appUrl` - Application URL
- `senderName` - Email sender name

## 🔄 Updating Email Settings

1. **Admin Panel**: Go to `/admin/options` and update email settings
2. **Rebuild**: Run `npx vercel --prod` to rebuild with new settings
3. **Automatic**: All static pages will automatically use the new email addresses

## 🛡️ Fallback Values

If the database is unavailable at build time, the system falls back to:

- `supportEmail`: support@jvs.org.uk
- `infoEmail`: info@jvs.org.uk
- `legalEmail`: legal@jvs.org.uk
- `privacyEmail`: privacy@jvs.org.uk
- `appName`: JVS Events
- `appUrl`: https://jvs.org.uk
- `senderName`: JVS Events

## 📝 Migration Checklist

To update existing static pages:

1. ✅ Import the appropriate utility function
2. ✅ Add emailSettings to your component props
3. ✅ Replace hardcoded email addresses with `emailSettings.supportEmail`
4. ✅ Add `generateStaticParams` (App Router) or `getStaticProps` (Pages Router)
5. ✅ Test that the page builds correctly
6. ✅ Deploy and verify email addresses are updated

## 🚨 Important Notes

- **Build Time Only**: Email settings are fetched when you build/deploy, not on every page load
- **Database Required**: The build process needs access to your database
- **Fallback Safety**: Pages will always render even if database is unavailable
- **Performance**: No runtime database calls means faster page loads for users

## 🔍 Troubleshooting

**Build fails with email settings error:**
- Check database connection during build
- Verify the options API endpoint is working
- Check console logs for specific error messages

**Email addresses not updating:**
- Ensure you've rebuilt the site after changing settings
- Check that the admin options page is saving correctly
- Verify the database contains the new values

**Pages showing fallback emails:**
- This is normal if the database is unavailable during build
- Check your database connection and options API
- Ensure the build process has access to your database
