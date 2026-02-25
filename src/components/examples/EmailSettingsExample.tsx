import React from 'react';
import { EmailSettings } from '../../lib/getEmailSettings';

interface EmailSettingsExampleProps {
  emailSettings: EmailSettings;
}

/**
 * Example component showing how to use email settings in a static page
 * This component receives emailSettings as props from the parent page
 */
export default function EmailSettingsExample({ emailSettings }: EmailSettingsExampleProps) {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
      
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-700">Support:</span>
          <a 
            href={`mailto:${emailSettings.supportEmail}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {emailSettings.supportEmail}
          </a>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-700">General Info:</span>
          <a 
            href={`mailto:${emailSettings.infoEmail}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {emailSettings.infoEmail}
          </a>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-700">Legal:</span>
          <a 
            href={`mailto:${emailSettings.legalEmail}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {emailSettings.legalEmail}
          </a>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="font-semibold text-gray-700">Privacy:</span>
          <a 
            href={`mailto:${emailSettings.privacyEmail}`}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {emailSettings.privacyEmail}
          </a>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          <strong>App Name:</strong> {emailSettings.appName}
        </p>
        <p className="text-sm text-gray-600">
          <strong>App URL:</strong> {emailSettings.appUrl}
        </p>
        <p className="text-sm text-gray-600">
          <strong>Sender Name:</strong> {emailSettings.senderName}
        </p>
      </div>
    </div>
  );
}
