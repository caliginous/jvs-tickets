import dynamic from 'next/dynamic';
import { IAddress } from '../../constants/interfaces';

// Lazy load the AddressComponent to reduce initial bundle size
const AddressComponent = dynamic(() => import('./AddressComponent').then(mod => ({ default: mod.AddressComponent })), {
    ssr: false,
    loading: () => (
        <div className="space-y-4">
            <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
                <div className="md:col-span-8">
                    <div className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>
    )
});

interface AddressComponentLazyProps {
    value: IAddress;
    onChange: (newAddress: IAddress) => unknown;
}

export const AddressComponentLazy = ({ value, onChange }: AddressComponentLazyProps) => {
    return <AddressComponent value={value} onChange={onChange} />;
};

export default AddressComponentLazy;
