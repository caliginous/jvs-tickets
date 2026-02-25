import { useState } from 'react';
import { Button } from '../../../ui';
import { showToast } from '../../../ui';
import {
    UploadIcon,
    CheckIcon,
    XIcon,
    ArrowRightIcon,
    ExclamationIcon,
    InformationCircleIcon,
    RefreshIcon
} from '@heroicons/react/solid';

interface CSVData {
    headers: string[];
    rows: any[];
}

interface FieldMapping {
    // User fields
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zip: string;
    country: string;
    
    // Event fields
    eventTitle: string;
    eventDate: string;
    
    // Order fields
    ticketType: string;
    price: string;
    paymentDate: string;
}

interface ImportStats {
    eventsCreated: number;
    usersCreated: number;
    usersUpdated: number;
    ordersCreated: number;
    ordersSkipped: number;
    ticketsCreated: number;
    errors: Array<{ row?: string; event?: string; error: string }>;
}

export default function CSVImportWizard() {
    const [step, setStep] = useState(1);
    const [csvData, setCSVData] = useState<CSVData | null>(null);
    const [mapping, setMapping] = useState<Partial<FieldMapping>>({});
    const [importing, setImporting] = useState(false);
    const [importStats, setImportStats] = useState<ImportStats | null>(null);

    // Step 1: Upload and parse CSV
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            let text = event.target?.result as string;
            
            console.log('🔍 File loaded, length:', text.length);
            console.log('🔍 First char code:', text.charCodeAt(0));
            
            // Remove BOM if present (common in CSV exports from Windows/CiviCRM)
            if (text.charCodeAt(0) === 0xFEFF || text.charCodeAt(0) === 65279) {
                console.log('⚠️  BOM detected and removed');
                text = text.slice(1);
            }
            
            console.log('🔍 After BOM removal, first 100 chars:', text.substring(0, 100));
            
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            showToast.error('CSV file is empty');
            return;
        }

        // Parse headers using proper CSV parsing
        const headers = parseCSVLine(lines[0]);
        console.log('📋 Detected headers:', headers);

        // Parse rows
        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length > 0) {
                const row: any = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                rows.push(row);
            }
        }

        console.log(`✅ Parsed ${rows.length} rows with ${headers.length} columns`);
        console.log('Sample row:', rows[0]);

        setCSVData({ headers, rows });
        
        // Auto-detect mappings
        autoDetectMapping(headers);
        
        setStep(2);
        showToast.success(`Loaded ${rows.length} rows with ${headers.length} columns`);
    };

    // Helper to parse CSV line (properly handles quoted fields with commas)
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                // Check if this is an escaped quote (two quotes in a row)
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i += 2; // Skip both quotes
                    continue;
                }
                // Toggle quote state
                inQuotes = !inQuotes;
                i++;
            } else if (char === ',' && !inQuotes) {
                // Field separator - push current field
                result.push(current.trim());
                current = '';
                i++;
            } else {
                // Regular character
                current += char;
                i++;
            }
        }
        
        // Push last field
        result.push(current.trim());

        // Clean up quotes from field values
        return result.map(field => field.replace(/^"|"$/g, ''));
    };

    const autoDetectMapping = (headers: string[]) => {
        const detected: Partial<FieldMapping> = {};

        // User field detection
        const findHeader = (keywords: string[]) => {
            return headers.find(h => 
                keywords.some(k => h.toLowerCase().includes(k.toLowerCase()))
            );
        };

        detected.firstName = findHeader(['First Name', 'first_name', 'firstname']) || '';
        detected.lastName = findHeader(['Last Name', 'last_name', 'lastname', 'surname']) || '';
        detected.email = findHeader(['Email', 'email', 'e-mail']) || '';
        detected.phone = findHeader(['Phone', 'phone', 'telephone', 'mobile']) || '';
        detected.address = findHeader(['Street Address', 'address', 'street']) || '';
        detected.city = findHeader(['City', 'city', 'town']) || '';
        detected.zip = findHeader(['Postal Code', 'postcode', 'zip', 'postal']) || '';
        detected.country = findHeader(['Country', 'country']) || '';
        
        detected.eventTitle = findHeader(['Event ID', 'Status', 'event', 'event name']) || '';
        detected.eventDate = findHeader(['Event Start Date', 'event date', 'date']) || '';
        detected.ticketType = findHeader(['Fee level', 'ticket type', 'ticket', 'level']) || '';
        detected.price = findHeader(['Participant Fee', 'fee', 'price', 'amount']) || '';
        detected.paymentDate = findHeader(['Payment Date', 'payment', 'paid date']) || '';

        setMapping(detected);
    };

    // Step 2: Confirm mappings
    const updateMapping = (field: keyof FieldMapping, value: string) => {
        setMapping({ ...mapping, [field]: value });
    };

    // Step 3: Execute import in batches to avoid timeout
    const executeImport = async () => {
        if (!csvData || !mapping.email || !mapping.eventTitle || !mapping.eventDate) {
            showToast.error('Please map required fields: Email, Event Title, Event Date');
            return;
        }

        setImporting(true);
        setStep(3);

        try {
            const BATCH_SIZE = 100; // Process 100 rows at a time
            const totalRows = csvData.rows.length;
            const batches = Math.ceil(totalRows / BATCH_SIZE);
            
            console.log(`🔄 Processing ${totalRows} rows in ${batches} batches of ${BATCH_SIZE}`);

            const combinedStats: ImportStats = {
                eventsCreated: 0,
                usersCreated: 0,
                usersUpdated: 0,
                ordersCreated: 0,
                ordersSkipped: 0,
                ticketsCreated: 0,
                errors: []
            };

            // Process each batch
            for (let i = 0; i < batches; i++) {
                const start = i * BATCH_SIZE;
                const end = Math.min(start + BATCH_SIZE, totalRows);
                const batchData = csvData.rows.slice(start, end);

                console.log(`📦 Processing batch ${i + 1}/${batches} (rows ${start + 1}-${end})`);

                const response = await fetch('/api/admin/import/execute', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        csvData: batchData,
                        mapping
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    
                    // Aggregate stats
                    combinedStats.eventsCreated += result.stats.eventsCreated;
                    combinedStats.usersCreated += result.stats.usersCreated;
                    combinedStats.usersUpdated += result.stats.usersUpdated;
                    combinedStats.ordersCreated += result.stats.ordersCreated;
                    combinedStats.ordersSkipped += result.stats.ordersSkipped;
                    combinedStats.ticketsCreated += result.stats.ticketsCreated;
                    combinedStats.errors.push(...result.stats.errors);

                    console.log(`✅ Batch ${i + 1} completed:`, result.stats);
                } else {
                    const error = await response.json();
                    console.error(`❌ Batch ${i + 1} failed:`, error);
                    combinedStats.errors.push({
                        event: `Batch ${i + 1}`,
                        error: error.error || 'Batch failed'
                    });
                }
            }

            setImportStats(combinedStats);
            showToast.success(`Import completed! Created ${combinedStats.eventsCreated} events and ${combinedStats.ordersCreated} orders.`);
            setStep(4);
        } catch (error) {
            console.error('Import error:', error);
            showToast.error('Import failed');
            setImporting(false);
        }
    };

    const reset = () => {
        setStep(1);
        setCSVData(null);
        setMapping({});
        setImporting(false);
        setImportStats(null);
    };

    return (
        <div className="space-y-6">
            {/* Progress Steps */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                    {[
                        { num: 1, title: 'Upload CSV' },
                        { num: 2, title: 'Map Fields' },
                        { num: 3, title: 'Import' },
                        { num: 4, title: 'Complete' }
                    ].map((s, idx) => (
                        <div key={s.num} className="flex items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                                step > s.num ? 'bg-green-500 text-white' :
                                step === s.num ? 'bg-blue-500 text-white' :
                                'bg-gray-200 text-gray-600'
                            }`}>
                                {step > s.num ? <CheckIcon className="w-6 h-6" /> : s.num}
                            </div>
                            <span className="ml-2 text-sm font-medium text-gray-700">{s.title}</span>
                            {idx < 3 && (
                                <ArrowRightIcon className="w-5 h-5 text-gray-400 mx-4" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Upload */}
            {step === 1 && (
                <div className="bg-white border border-gray-200 rounded-lg p-8">
                    <div className="text-center">
                        <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-lg font-medium text-gray-900">Upload CiviCRM Export CSV</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Select your CSV file to begin the import process
                        </p>
                        <div className="mt-6">
                            <label className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer">
                                <UploadIcon className="h-5 w-5 mr-2" />
                                Choose CSV File
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-2">Expected CSV Format:</p>
                                <ul className="list-disc list-inside space-y-1 ml-2">
                                    <li>First Name, Last Name, Email (required)</li>
                                    <li>Event information (name and date)</li>
                                    <li>Ticket type and price</li>
                                    <li>Phone, address, postal code (optional)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Field Mapping */}
            {step === 2 && csvData && (
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Map CSV Fields to Database Schema
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            We&apos;ve auto-detected some mappings. Please verify and adjust as needed.
                            <br />
                            <strong>Total rows to import:</strong> {csvData.rows.length}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* User Fields */}
                            <div className="col-span-full">
                                <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b">
                                    User Information
                                </h4>
                            </div>
                            
                            {[
                                { key: 'firstName', label: 'First Name', required: true },
                                { key: 'lastName', label: 'Last Name', required: true },
                                { key: 'email', label: 'Email', required: true },
                                { key: 'phone', label: 'Phone', required: false },
                                { key: 'address', label: 'Address', required: false },
                                { key: 'city', label: 'City', required: false },
                                { key: 'zip', label: 'Postal Code', required: false },
                                { key: 'country', label: 'Country', required: false },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        value={mapping[field.key as keyof FieldMapping] || ''}
                                        onChange={(e) => updateMapping(field.key as keyof FieldMapping, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select Column --</option>
                                        {csvData.headers.map(header => (
                                            <option key={header} value={header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            {/* Event Fields */}
                            <div className="col-span-full mt-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b">
                                    Event Information
                                </h4>
                            </div>
                            
                            {[
                                { key: 'eventTitle', label: 'Event Title/Name', required: true },
                                { key: 'eventDate', label: 'Event Date', required: true },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        value={mapping[field.key as keyof FieldMapping] || ''}
                                        onChange={(e) => updateMapping(field.key as keyof FieldMapping, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select Column --</option>
                                        {csvData.headers.map(header => (
                                            <option key={header} value={header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}

                            {/* Order Fields */}
                            <div className="col-span-full mt-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-3 pb-2 border-b">
                                    Order/Ticket Information
                                </h4>
                            </div>
                            
                            {[
                                { key: 'ticketType', label: 'Ticket Type/Fee Level', required: false },
                                { key: 'price', label: 'Price/Fee', required: false },
                                { key: 'paymentDate', label: 'Payment Date', required: false },
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        value={mapping[field.key as keyof FieldMapping] || ''}
                                        onChange={(e) => updateMapping(field.key as keyof FieldMapping, e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select Column --</option>
                                        {csvData.headers.map(header => (
                                            <option key={header} value={header}>{header}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Sample Preview */}
                    {csvData.rows.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h4 className="text-md font-semibold text-gray-800 mb-4">Preview (First 3 Rows)</h4>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row 1</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row 2</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Row 3</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Object.entries(mapping).filter(([_, v]) => v).map(([key, csvColumn]) => (
                                            <tr key={key}>
                                                <td className="px-4 py-2 text-sm font-medium text-gray-900">{key}</td>
                                                {[0, 1, 2].map(idx => (
                                                    <td key={idx} className="px-4 py-2 text-sm text-gray-600">
                                                        {csvData.rows[idx]?.[csvColumn as string] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-between">
                        <Button onClick={() => setStep(1)} variant="outline">
                            Back
                        </Button>
                        <Button 
                            onClick={executeImport}
                            disabled={!mapping.email || !mapping.eventTitle || !mapping.eventDate}
                            variant="solid"
                        >
                            <ArrowRightIcon className="h-4 w-4 mr-2" />
                            Start Import
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: Importing */}
            {step === 3 && (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                    <RefreshIcon className="mx-auto h-16 w-16 text-blue-600 animate-spin" />
                    <h3 className="mt-4 text-xl font-medium text-gray-900">Importing Data...</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Processing {csvData?.rows.length} rows. This may take a few minutes.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        Please don&apos;t close this window.
                    </p>
                </div>
            )}

            {/* Step 4: Results */}
            {step === 4 && importStats && (
                <div className="space-y-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
                        <CheckIcon className="mx-auto h-16 w-16 text-green-600" />
                        <h3 className="mt-4 text-xl font-medium text-green-900">
                            Import Completed Successfully!
                        </h3>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-blue-600">{importStats.eventsCreated}</p>
                            <p className="text-sm text-gray-600 mt-1">Events Created</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{importStats.usersCreated}</p>
                            <p className="text-sm text-gray-600 mt-1">Users Created</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-purple-600">{importStats.usersUpdated}</p>
                            <p className="text-sm text-gray-600 mt-1">Users Updated</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600">{importStats.ordersCreated}</p>
                            <p className="text-sm text-gray-600 mt-1">Orders Created</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-gray-600">{importStats.ordersSkipped}</p>
                            <p className="text-sm text-gray-600 mt-1">Orders Skipped</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-pink-600">{importStats.ticketsCreated}</p>
                            <p className="text-sm text-gray-600 mt-1">Tickets Created</p>
                        </div>
                    </div>

                    {/* Errors */}
                    {importStats.errors.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                            <div className="flex items-start space-x-3">
                                <ExclamationIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-yellow-900 mb-2">
                                        {importStats.errors.length} Errors Occurred
                                    </h4>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {importStats.errors.slice(0, 10).map((err, idx) => (
                                            <div key={idx} className="text-xs text-yellow-800 bg-yellow-100 rounded p-2">
                                                <p><strong>Row:</strong> {err.row || err.event}</p>
                                                <p><strong>Error:</strong> {err.error}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {importStats.errors.length > 10 && (
                                        <p className="text-xs text-yellow-700 mt-2">
                                            ...and {importStats.errors.length - 10} more errors
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-center">
                        <Button onClick={reset} variant="solid">
                            <RefreshIcon className="h-4 w-4 mr-2" />
                            Import Another File
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
