import { MainCard } from "../MainCard";
import { CurrencyDollarIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/solid';
import { formatPrice } from "../../../../constants/util";

export const TotalRevenueCard = ({totalRevenue, earningPercentage, defaultCurrency}) => {
    const earningPercentageRounded = earningPercentage?.toFixed(3) ?? 0;
    const rotation = earningPercentageRounded === 0 ? 0 : earningPercentageRounded < 0 ? 25 : -25;
    const percentageChange = (Math.abs(earningPercentageRounded) * 100).toFixed(1);
    const text = "The total revenue within the last 7 days " + (earningPercentageRounded === 0 ? "did not change" : earningPercentageRounded < 0 ? `decreased by ${percentageChange}%` : `increased by ${percentageChange}%`)

    const getIcon = () => {
        if (earningPercentageRounded === 0) {
            return <MinusIcon className="w-5 h-5" />;
        } else if (earningPercentageRounded < 0) {
            return <ArrowDownIcon className="w-5 h-5" />;
        } else {
            return <ArrowUpIcon className="w-5 h-5" />;
        }
    };

    return (
        <MainCard
            title={formatPrice(totalRevenue, defaultCurrency)}
            secondaryTitle={"Total Revenue"}
            icon={<CurrencyDollarIcon /> }
            color={{
                dark: '#1f2937',
                main: '#3b82f6',
                light: '#dbeafe',
                contrastText: '#ffffff',
                200: '#bfdbfe'
            }}
            titleIcon={earningPercentage && (
                <div title={text} className="cursor-help">
                    {getIcon()}
                </div>
            )}
        />
    )
}
