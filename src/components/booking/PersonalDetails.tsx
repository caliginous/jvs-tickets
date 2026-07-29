import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectPersonalInformation,
  setFirstName,
  setLastName,
  setEmail,
  setPhone,
  setCustomFields,
  setSubscribeNewsletter,
  setSubscribeEvents
} from '../../store/reducers/personalInformationReducer';
import { CustomFields } from '../form/CustomFields';
import { CustomFieldValidator } from '../../types/customFields';

interface PersonalDetailsProps {
  isActive: boolean;
  onComplete: () => void;
  isLoading?: boolean;
  event?: any; // Event data including customFields
}

export const PersonalDetails: React.FC<PersonalDetailsProps> = ({
  isActive,
  onComplete,
  isLoading = false,
  event
}) => {
  const dispatch = useAppDispatch();
  const personalInfo = useAppSelector(selectPersonalInformation);
  
  // Use local state for form data to ensure proper editing
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize form data from Redux state only once on mount
  useEffect(() => {
    if (personalInfo) {
      const initialData = {
        firstName: personalInfo.address?.firstName || '',
        lastName: personalInfo.address?.lastName || '',
        email: personalInfo.email || '',
        phone: personalInfo.phone || ''
      };
      setFormData(initialData);
    }
  }, [personalInfo]); // Include personalInfo in dependencies to prevent stale closures

  const validateField = (name: string, value: string) => {
    if (!value.trim()) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }
    
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }
    
    if (name === 'phone') {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(value.replace(/\s/g, ''))) {
        return 'Please enter a valid phone number';
      }
    }
    

    
    return '';
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update local form state immediately for responsive editing
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      return newData;
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Update Redux store immediately for real-time validation
    switch (name) {
      case 'firstName':
        dispatch(setFirstName(value));
        break;
      case 'lastName':
        dispatch(setLastName(value));
        break;
      case 'email':
        dispatch(setEmail(value));
        break;
      case 'phone':
        dispatch(setPhone(value));
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Mark field as touched
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Update local form state to keep track of current values
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
    
    // Update Redux store on blur (when user finishes editing)
    switch (name) {
      case 'firstName':
        dispatch(setFirstName(value));
        break;
      case 'lastName':
        dispatch(setLastName(value));
        break;
      case 'email':
        dispatch(setEmail(value));
        break;
      case 'phone':
        dispatch(setPhone(value));
        break;
    }
  };

  // Validate all fields when formData changes to handle autofill
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    
    // Only validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'phone'];
    
    requiredFields.forEach(fieldName => {
      const value = formData[fieldName as keyof typeof formData];
      const error = validateField(fieldName, value);
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    
    setErrors(newErrors);
  }, [formData]);

  if (!isActive) {
    return null;
  }

  const hasErrors = Object.keys(errors).length > 0;
  
  // Validate custom fields
  const customFieldsValid = event?.customFields 
    ? CustomFieldValidator.validateCustomerResponses(event.customFields, personalInfo.customFields || {})
    : true;
  
  const isFormValid = !hasErrors && 
    formData.firstName.trim() !== '' && 
    formData.lastName.trim() !== '' && 
    formData.email.trim() !== '' &&
    formData.phone.trim() !== '' &&
    customFieldsValid;

  return (
    <div className="space-y-8">
      {/* Introduction and GDPR Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              We&apos;ll need your details to confirm your tickets
            </h3>
            <p className="text-blue-800 text-sm leading-relaxed">
              Your data is safe and will not be shared with third parties. We only use this information to process your booking and send you confirmation details. 
              <span className="font-medium"> By continuing, you agree to our data processing practices.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Contact Details Section */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-3">
          <h4 className="text-lg font-semibold text-neutral-900">Contact Information</h4>
          <p className="text-sm text-neutral-600">How we can reach you about your booking</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              defaultValue={formData.firstName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Enter your first name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors ${
                touched.firstName && errors.firstName 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-neutral-300'
              }`}
            />
            {touched.firstName && errors.firstName && (
              <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errors.firstName}</span>
              </p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              defaultValue={formData.lastName}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Enter your last name"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors ${
                touched.lastName && errors.lastName 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-neutral-300'
              }`}
            />
            {touched.lastName && errors.lastName && (
              <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errors.lastName}</span>
              </p>
            )}
          </div>

          {/* Email */}
          <div className="md:col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={formData.email}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Enter your email address"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors ${
                touched.email && errors.email 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-neutral-300'
              }`}
            />
            {touched.email && errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errors.email}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              We&apos;ll send your ticket confirmation to this email address
            </p>
          </div>

          {/* Phone */}
          <div className="md:col-span-2">
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              required
              defaultValue={formData.phone}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="Enter your phone number"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white text-black transition-colors ${
                touched.phone && errors.phone 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-neutral-300'
              }`}
            />
            {touched.phone && errors.phone && (
              <p className="mt-1 text-sm text-red-600 flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>{errors.phone}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-neutral-500">
              For urgent booking updates only
            </p>
          </div>
        </div>
      </div>

      {/* Optional email subscriptions */}
      <fieldset className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
        <legend className="px-1 text-lg font-semibold text-neutral-900">Keep in touch with JVS</legend>
        <p className="text-sm text-neutral-600">
          Optional. Choose either or both. After your booking is complete, we&apos;ll email you to confirm your subscription.
        </p>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={personalInfo.subscribeNewsletter}
            onChange={(event) => dispatch(setSubscribeNewsletter(event.target.checked))}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-900">JVS newsletter</span>
            <span className="block text-sm text-neutral-600">Receive our newsletter (2–3 issues a month).</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={personalInfo.subscribeEvents}
            onChange={(event) => dispatch(setSubscribeEvents(event.target.checked))}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-900">Event emails</span>
            <span className="block text-sm text-neutral-600">Hear about upcoming JVS events and ticket releases.</span>
          </span>
        </label>
      </fieldset>

      {/* Custom Fields Section */}
      {event?.customFields && event.customFields.length > 0 && (
        <div className="space-y-6">
          <div className="border-b border-neutral-200 pb-3">
            <h4 className="text-lg font-semibold text-neutral-900">Additional Information</h4>
            <p className="text-sm text-neutral-600">Please provide the following details</p>
          </div>
          
          <CustomFields
            customFields={event.customFields}
            value={personalInfo.customFields || {}}
            onChange={(newValue) => dispatch(setCustomFields(newValue))}
          />
        </div>
      )}

      {/* Data Protection Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <div className="text-sm text-green-800">
            <p className="font-medium">Your data is protected</p>
            <p>We use industry-standard encryption and never share your personal information with third parties. Your details are only used to process this booking.</p>
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-medium text-red-800">Please fix the following errors:</span>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([field, error]) => (
              <li key={field} className="flex items-center space-x-2">
                <span>•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={() => {
            // Ensure all form data is saved to Redux before continuing
            dispatch(setFirstName(formData.firstName));
            dispatch(setLastName(formData.lastName));
            dispatch(setEmail(formData.email));
            dispatch(setPhone(formData.phone));
            
            // Small delay to ensure Redux updates are processed
            setTimeout(() => {
              onComplete();
            }, 50);
          }}
          disabled={!isFormValid || isLoading}
          className={`px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 ${
            isFormValid && !isLoading
              ? 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800'
              : 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Continue to Payment</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
