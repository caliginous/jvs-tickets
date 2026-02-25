import { MainCard } from "../MainCard";
import { formatPrice } from "../../../../constants/util";
import { CalendarIcon } from '@heroicons/react/solid';

export const PopularCard = ({dataByEvent, currency}) => {
    const totalRevenue = Object.values(dataByEvent).reduce((total: number, data: {revenue: number}) => total + data.revenue, 0);

    return (
        <MainCard
            title={"Popular Events"}
            color={{
                main: "#EEEEEE",
                dark: "#FFFFFF",
                light: "#CCCCCC",
                contrastText: "#222222"
            }}
            icon={<CalendarIcon />}
        >
            <div className="space-y-4">
                {
                    Object.entries(dataByEvent)
                        .sort((a: [string, {revenue: number}], b: [string, {revenue: number}]) => b[1].revenue - a[1].revenue)
                        .map((data, index) => <PopularListItem key={index} eventName={data[0]} data={data[1]} index={index} currency={currency} totalRevenue={totalRevenue} />)
                }
            </div>
        </MainCard>
    )
}

const PopularListItem = ({eventName, data, index, currency, totalRevenue}) => {
    return (
        <>
            {
                index > 0 && <div className="border-t border-gray-200 my-2" />
            }
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-base font-medium text-gray-900">
                            {eventName}
                        </h4>
                        <p className="text-sm text-green-700">
                            {(data.revenue / totalRevenue * 100).toFixed(2)}% of total revenue
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-base font-medium text-gray-900">
                            Revenue: <strong>{formatPrice(data.revenue, currency)}</strong>
                        </p>
                        <p className="text-base font-medium text-gray-900">
                            Tickets: <strong>{data.ticketAmount}</strong>
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
