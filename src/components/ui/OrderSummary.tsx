import React from 'react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './Card';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  tax?: number;
  total: number;
  className?: string;
}

export function OrderSummary({ items, subtotal, tax = 0, total, className }: OrderSummaryProps) {
  return (
    <Card className={cn("sticky top-24", className)}>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-neutral-900">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-neutral-600">{item.description}</div>
                )}
                <div className="text-sm text-neutral-500">Qty: {item.quantity}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-neutral-900">
                  £{(item.price * item.quantity).toFixed(2)}
                </div>
                <div className="text-sm text-neutral-500">£{item.price.toFixed(2)} each</div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Divider */}
        <div className="border-t border-neutral-200 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Subtotal</span>
              <span className="text-neutral-900">£{subtotal.toFixed(2)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Tax</span>
                <span className="text-neutral-900">£{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-neutral-200 pt-2">
              <span className="font-medium text-neutral-900">Total</span>
              <span className="font-bold text-lg text-primary-600">£{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
