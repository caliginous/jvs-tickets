import { PaymentFactory, PaymentType } from "../store/factories/payment/PaymentFactory";

export const getTaskType = (task) => {
    if (!hasPayed(task.order))
        return "payment";
    if (!hasShipped(task.order))
        return "shipping";
    return null;
};
export const hasPayed = (order) => {
    // Check if order is refunded first
    if (order.status === "REFUNDED" || order.status === "PARTIALLY_REFUNDED") {
        return false;
    }
    
    // Map database payment types to PaymentFactory types
    let mappedPaymentType = order.paymentType;
    if (order.paymentType === 'stripe' || order.paymentType === 'CreditCard' || order.paymentType === 'card') {
        mappedPaymentType = 'creditcard'; // All these map to creditcard
    }
    
    // Use getAllPaymentInstances to find the right instance by type
    const allInstances = PaymentFactory.getAllPaymentInstances();
    
    const paymentInstance = allInstances.find(instance => 
        instance.data.type === mappedPaymentType
    );
    
    if (!paymentInstance) {
        return false;
    }
    
    return paymentInstance.paymentResultValid(order.paymentResult);
};
export const hasShipped = (order) => {
    const shipping = JSON.parse(order.shipping);
    return shipping?.data?.isShipped !== undefined && shipping.data.isShipped;
};
