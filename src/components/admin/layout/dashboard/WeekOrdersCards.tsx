import { Card, CardContent } from "../../../../ui";
import { ShoppingBagIcon, ExclamationIcon } from '@heroicons/react/solid';
import { formatPrice } from "../../../../constants/util";

export const WeekOrdersCards = ({weekRevenue, defaultCurrency, unresolvedTickets}) => {
    return (
        <div className="space-y-4">
            {/* Last Week Revenue Card */}
            <Card className="relative overflow-hidden bg-amber-50">
                {/* Decorative circles */}
                <div className="absolute w-52 h-52 rounded-full opacity-30 bg-amber-200 -top-8 -right-44" />
                <div className="absolute w-52 h-52 rounded-full opacity-30 bg-amber-200 -top-40 -right-32" />
                
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-amber-200 rounded-lg flex items-center justify-center mr-4">
                            <ShoppingBagIcon className="w-6 h-6 text-amber-800" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-2xl font-semibold text-gray-900 mb-1">
                                {formatPrice(weekRevenue, defaultCurrency)}
                            </h4>
                            <p className="text-sm text-gray-600">
                                Last Week Revenue
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Unprocessed Tickets Card */}
            <Card className="relative overflow-hidden bg-red-50">
                {/* Decorative circles */}
                <div className="absolute w-52 h-52 rounded-full opacity-30 bg-red-200 -top-8 -right-44" />
                <div className="absolute w-52 h-52 rounded-full opacity-30 bg-red-200 -top-40 -right-32" />
                
                <CardContent className="p-4 relative z-10">
                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-red-200 rounded-lg flex items-center justify-center mr-4">
                            <ExclamationIcon className="w-6 h-6 text-red-800" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-2xl font-semibold text-gray-900 mb-1">
                                {unresolvedTickets}
                            </h4>
                            <p className="text-sm text-gray-600">
                                Unprocessed tickets
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
};
