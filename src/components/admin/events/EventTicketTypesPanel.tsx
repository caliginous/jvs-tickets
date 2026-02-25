import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeOffIcon,
  DuplicateIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/solid';

interface EventTicketType {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  capacity?: number | null;
  sold: number;
  isActive: boolean;
  sortOrder: number;
  colorHex?: string | null;
}

interface EventTicketTypesPanelProps {
  eventId?: number;
  mode?: 'existing' | 'creating';
  initialTicketTypes?: EventTicketType[];
  onTicketTypesChange?: (ticketTypes: EventTicketType[]) => void;
}

export default function EventTicketTypesPanel({ 
  eventId, 
  mode = 'existing',
  initialTicketTypes = [],
  onTicketTypesChange 
}: EventTicketTypesPanelProps) {
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>(initialTicketTypes);
  const [loading, setLoading] = useState(mode === 'existing');
  const [error, setError] = useState<string | null>(null);
  
  // Debug logging

  const [editingType, setEditingType] = useState<EventTicketType | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const loadTicketTypes = useCallback(async () => {
    console.log('[EventTicketTypesPanel] loadTicketTypes called with eventId:', eventId);
    
    if (!eventId) {
      console.log('[EventTicketTypesPanel] No eventId provided, setting error');
      setError('Event ID is required to load ticket types');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('[EventTicketTypesPanel] Fetching ticket types from:', `/api/admin/events/${eventId}/ticket-types`);
      
      const response = await fetch(`/api/admin/events/${eventId}/ticket-types`);
      console.log('[EventTicketTypesPanel] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[EventTicketTypesPanel] API error:', response.status, errorText);
        throw new Error(`Failed to load ticket types: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      console.log('[EventTicketTypesPanel] Loaded ticket types:', data);
      
      setTicketTypes(data);
      onTicketTypesChange?.(data);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('[EventTicketTypesPanel] Error loading ticket types:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]); // Removed onTicketTypesChange dependency to prevent infinite loop

  // Load ticket types on component mount (only for existing mode)
  useEffect(() => {
    console.log('[EventTicketTypesPanel] useEffect triggered with:', { mode, eventId, initialTicketTypesLength: initialTicketTypes.length });
    
    if (mode === 'existing' && eventId) {
      console.log('[EventTicketTypesPanel] Mode is existing and eventId is present, calling loadTicketTypes');
      loadTicketTypes();
    } else if (mode === 'creating') {
      console.log('[EventTicketTypesPanel] Mode is creating, using initial ticket types');
      // For creating mode, use initial ticket types and set loading to false
      setTicketTypes(initialTicketTypes);
      setLoading(false);
      onTicketTypesChange?.(initialTicketTypes);
    } else {
      console.log('[EventTicketTypesPanel] Neither condition met, mode:', mode, 'eventId:', eventId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, mode]); // Removed problematic dependencies that cause infinite loop

  // Separate effect for updating initial ticket types in creating mode
  useEffect(() => {
    if (mode === 'creating') {
      setTicketTypes(initialTicketTypes);
      onTicketTypesChange?.(initialTicketTypes);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTicketTypes, mode]); // Removed onTicketTypesChange dependency

  const moveTicketType = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === ticketTypes.length - 1) return;

    const items = Array.from(ticketTypes);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    [items[index], items[newIndex]] = [items[newIndex], items[index]];

    // Update sort order
    const updatedItems = items.map((item, idx) => ({
      ...item,
      sortOrder: idx
    }));

    setTicketTypes(updatedItems);

    // Save new order to backend
    try {
      await Promise.all(
        updatedItems.map(item =>
          fetch(`/api/admin/events/${eventId}/ticket-types/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.name,
              price: item.price,
              description: item.description,
              currency: item.currency,
              capacity: item.capacity,
              colorHex: item.colorHex,
              isActive: item.isActive,
              sortOrder: item.sortOrder
            })
          })
        )
      );
      onTicketTypesChange?.(updatedItems);
    } catch (err) {
      console.error('Failed to update sort order:', err);
      // Revert on error
      loadTicketTypes();
    }
  };

  const handleAddTicketType = async (formData: Partial<EventTicketType>) => {
    if (mode === 'creating') {
      // For creating mode, just update local state
      const newTicketType = {
        ...formData,
        id: Date.now(), // Temporary ID for local state
        sold: 0,
        sortOrder: ticketTypes.length
      } as EventTicketType;
      
      const updatedTicketTypes = [...ticketTypes, newTicketType];
      setTicketTypes(updatedTicketTypes);
      setShowAddForm(false);
      onTicketTypesChange?.(updatedTicketTypes);
      return;
    }

    // Existing mode - make API call
    if (!eventId) {
      setError('Event ID is required to create ticket type');
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/ticket-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket type');
      }

      const newTicketType = await response.json();
      setTicketTypes(prev => [...prev, newTicketType]);
      setShowAddForm(false);
      onTicketTypesChange?.([...ticketTypes, newTicketType]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket type');
    }
  };

  const handleUpdateTicketType = async (id: number, updates: Partial<EventTicketType>) => {
    if (mode === 'creating') {
      // For creating mode, just update local state
      const updatedTicketTypes = ticketTypes.map(type => 
        type.id === id ? { ...type, ...updates } : type
      );
      setTicketTypes(updatedTicketTypes);
      setEditingType(null);
      onTicketTypesChange?.(updatedTicketTypes);
      return;
    }

    // Existing mode - make API call
    if (!eventId) {
      setError('Event ID is required to update ticket type');
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/ticket-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update ticket type');
      }

      const updatedTicketType = await response.json();
      setTicketTypes(prev => 
        prev.map(type => type.id === id ? updatedTicketType : type)
      );
      setEditingType(null);
      onTicketTypesChange?.(ticketTypes.map(type => type.id === id ? updatedTicketType : type));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket type');
    }
  };

  const handleDeleteTicketType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ticket type? This action cannot be undone.')) {
      return;
    }

    if (mode === 'creating') {
      // For creating mode, just update local state
      const updatedTicketTypes = ticketTypes.filter(type => type.id !== id);
      setTicketTypes(updatedTicketTypes);
      onTicketTypesChange?.(updatedTicketTypes);
      return;
    }

    // Existing mode - make API call
    if (!eventId) {
      setError('Event ID is required to delete ticket type');
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}/ticket-types/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete ticket type');
      }

      setTicketTypes(prev => prev.filter(type => type.id !== id));
      onTicketTypesChange?.(ticketTypes.filter(type => type.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket type');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await handleUpdateTicketType(id, { isActive });
    } catch (err) {
      // Error already handled in handleUpdateTicketType
    }
  };

  const handleDuplicate = async (ticketType: EventTicketType) => {
    const duplicated = {
      ...ticketType,
      name: `${ticketType.name} (Copy)`,
      sold: 0,
      sortOrder: ticketTypes.length
    };
    delete (duplicated as any).id;
    
    await handleAddTicketType(duplicated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <p className="text-sm font-medium">Error loading ticket types</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={loadTicketTypes}
          className="mt-3 text-sm text-red-600 hover:text-red-500 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  console.log('[EventTicketTypesPanel] Rendering with:', { 
    loading, 
    error, 
    ticketTypesLength: ticketTypes.length, 
    eventId, 
    mode 
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Ticket Types</h3>
          <p className="text-sm text-gray-500">
            Manage the different types of tickets available for this event
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <DuplicateIcon className="h-4 w-4 mr-2" />
            Add from Template
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Ticket Type
          </button>
        </div>
      </div>

      {/* Ticket Types List */}
      {ticketTypes.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No ticket types</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new ticket type or adding from a template.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ticketTypes.map((ticketType, index) => (
            <div
              key={ticketType.id}
              className={`bg-white border rounded-lg p-4 shadow-sm ${!ticketType.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => moveTicketType(index, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveTicketType(index, 'down')}
                      disabled={index === ticketTypes.length - 1}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {ticketType.name}
                      </h4>
                      {ticketType.colorHex && (
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: ticketType.colorHex }}
                        />
                      )}
                      {!ticketType.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {ticketType.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {ticketType.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                      <span>Price: £{(ticketType.price / 100).toFixed(2)}</span>
                      <span>Currency: {ticketType.currency}</span>
                      {ticketType.capacity !== null ? (
                        <span>
                          Capacity: {ticketType.sold}/{ticketType.capacity}
                          {ticketType.capacity - ticketType.sold > 0 && (
                            <span className="text-green-600 ml-1">
                              ({ticketType.capacity - ticketType.sold} available)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>Unlimited capacity</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(ticketType.id, !ticketType.isActive)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title={ticketType.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {ticketType.isActive ? (
                      <EyeIcon className="h-4 w-4" />
                    ) : (
                                                    <EyeOffIcon className="h-4 w-4" />
                    )}
                  </button>
                  
                                              <button
                              onClick={() => handleDuplicate(ticketType)}
                              className="p-2 text-gray-400 hover:text-gray-600"
                              title="Duplicate"
                            >
                              <DuplicateIcon className="h-4 w-4" />
                            </button>
                  
                  <button
                    onClick={() => setEditingType(ticketType)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteTicketType(ticketType.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Delete"
                    disabled={ticketType.sold > 0}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Forms */}
      {(showAddForm || editingType) && (
        <TicketTypeForm
          eventId={eventId}
          ticketType={editingType}
          onSave={async (formData) => {
            if (editingType) {
              await handleUpdateTicketType(editingType.id, formData);
            } else {
              await handleAddTicketType(formData);
            }
          }}
          onCancel={() => {
            setShowAddForm(false);
            setEditingType(null);
          }}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplates && (
        <TemplateSelectionModal
          eventId={eventId}
          onSelect={async (template) => {
            await handleAddTicketType(template);
            setShowTemplates(false);
          }}
          onCancel={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}

// Ticket Type Form Component
interface TicketTypeFormProps {
  eventId?: number;
  ticketType?: EventTicketType | null;
  onSave: (data: Partial<EventTicketType>) => Promise<void>;
  onCancel: () => void;
}

function TicketTypeForm({ eventId, ticketType, onSave, onCancel }: TicketTypeFormProps) {
  const [formData, setFormData] = useState({
    name: ticketType?.name || '',
    description: ticketType?.description || '',
    price: ticketType ? (ticketType.price / 100).toFixed(2) : '',
    currency: ticketType?.currency || 'GBP',
    capacity: ticketType?.capacity?.toString() || '',
    colorHex: ticketType?.colorHex || '#000000',
    isActive: ticketType?.isActive ?? true
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    
    try {
      await onSave({
        ...formData,
        price: parseFloat(formData.price) * 100, // Convert to pence
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        colorHex: formData.colorHex || null
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-medium text-gray-900 mb-4">
        {ticketType ? 'Edit Ticket Type' : 'Add New Ticket Type'}
      </h4>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price (£) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.price}
              onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Capacity
            </label>
            <input
              type="number"
              min="0"
              placeholder="Leave empty for unlimited"
              value={formData.capacity}
              onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Color (Hex)
            </label>
            <input
              type="color"
              value={formData.colorHex}
              onChange={(e) => setFormData(prev => ({ ...prev, colorHex: e.target.value }))}
              className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active
            </label>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder="Optional description for this ticket type"
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : (ticketType ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Template Selection Modal Component
interface TemplateSelectionModalProps {
  eventId: number;
  onSelect: (template: Partial<EventTicketType>) => Promise<void>;
  onCancel: () => void;
}

function TemplateSelectionModal({ eventId, onSelect, onCancel }: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load global templates (categories)
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // This would load from your global template system
      // For now, using mock data
      setTemplates([
        { id: 1, name: 'Standard', price: 25.00, description: 'Standard admission ticket' },
        { id: 2, name: 'VIP', price: 50.00, description: 'VIP experience with premium seating' },
        { id: 3, name: 'Student', price: 15.00, description: 'Student discount ticket' },
      ]);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = async (template: any) => {
    await onSelect({
      name: template.name,
      description: template.description,
      price: Math.round(template.price * 100), // Convert to pence
      currency: 'GBP',
      capacity: null, // Unlimited by default
      isActive: true,
      sortOrder: 0
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Select Template</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleTemplateSelect(template)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-500">{template.description}</p>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  £{template.price.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
