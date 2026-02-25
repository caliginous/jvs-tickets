import { MainCard } from "../MainCard";
import dynamic from "next/dynamic";
import { ChartBarIcon, ChartPieIcon } from '@heroicons/react/solid';
import { useMemo, useState, useCallback } from "react";
import { Button } from "../../../../ui";

// Optimize: Use dynamic import with loading fallback
const Chart = dynamic(() => import('react-apexcharts'), { 
    ssr: false,
    loading: () => <div className="h-75 flex items-center justify-center">Loading chart...</div>
});

type SamplePoint = {revenue: number; ticketAmount: number};

const lineYAxis = () => [
    {
        axisTicks: {
            show: true
        },
        axisBorder: {
            show: true,
            color: '#6b7280' // text-gray-500
        },
        labels: {
            style: {
                colors: '#6b7280' // text-gray-500
            },
            formatter: function (val) {
                return val?.toFixed(2)
            }
        },
        title: {
            text: "Revenue",
            style: {
                color: '#6b7280' // text-gray-500
            }
        }
    },
    {
        opposite: true,
        axisTicks: {
            show: true
        },
        axisBorder: {
            show: true,
            color: '#3b82f6' // text-blue-500
        },
        labels: {
            style: {
                colors: '#3b82f6' // text-blue-500
            },
            formatter: function (val) {
                return val?.toFixed(0)
            }
        },
        title: {
            text: "Ticket Amount",
            style: {
                color: '#3b82f6' // text-blue-500
            }
        }
    }
];

const addDays = (date, days) => {
    let newDate = new Date(date.valueOf());
    newDate.setDate(date.getDate() + days);
    return newDate;
}

// Optimize: Memoize the date filling function
const fillDatesOneYear = (object: Record<string, SamplePoint>): Record<string, SamplePoint> => {
    const newObject = Object.assign({}, object);
    const compareDate = new Date();
    compareDate.setDate(compareDate.getDate() - 365);
    let currentDate = compareDate;
    let stopDate = new Date();
    
    // Pre-allocate the array for better performance
    const dates = [];
    while (currentDate <= stopDate) {
        dates.push(currentDate.toISOString().split("T")[0]);
        currentDate = addDays(currentDate, 1);
    }
    
    // Fill in missing dates
    dates.forEach(date => {
        if (!(date in newObject)) {
            newObject[date] = {revenue: 0, ticketAmount: 0};
        }
    });
    
    return newObject;
}

export const RevenueGraphCard = ({oneYearOrdersGroup}: {oneYearOrdersGroup: Record<string, SamplePoint>}) => {
    const [chartType, setChartType] = useState<"line" | "bar">("line");
    const [duration, setDuration] = useState<number>(7);
    
    // Optimize: Memoize expensive calculations
    const filledYearsGroup = useMemo(() => {
        return fillDatesOneYear(oneYearOrdersGroup)
    }, [oneYearOrdersGroup]);

    const compareDate = useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() - duration);
        return date.getTime();
    }, [duration]);

    // Optimize: Memoize filtered data
    const groupedData = useMemo(() => {
        if (duration > 50) {
            return filledYearsGroup;
        }
        return Object.fromEntries(
            Object.entries(filledYearsGroup).filter(([date]) => {
                const dateTime = new Date(date).getTime();
                return dateTime >= compareDate;
            })
        );
    }, [filledYearsGroup, compareDate, duration]);

    // Optimize: Memoize chart options
    const chartOptions = useMemo(() => ({
        chart: {
            type: chartType,
            toolbar: {
                show: false
            },
            zoom: {
                enabled: false
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth' as const,
            width: 2
        },
        colors: ['#6b7280', '#3b82f6'], // text-gray-500, text-blue-500
        xaxis: {
            type: 'datetime' as const,
            categories: Object.keys(groupedData),
            labels: {
                style: {
                    colors: '#6b7280' // text-gray-500
                }
            }
        },
        yaxis: lineYAxis(),
        tooltip: {
            x: {
                format: 'dd MMM yyyy'
            }
        },
        legend: {
            position: 'top' as const,
            horizontalAlign: 'right' as const
        }
    }), [chartType, groupedData]);

    // Optimize: Memoize chart series data
    const chartSeries = useMemo(() => [
        {
            name: 'Revenue',
            type: chartType,
            data: Object.values(groupedData).map(point => point.revenue)
        },
        {
            name: 'Tickets',
            type: chartType,
            data: Object.values(groupedData).map(point => point.ticketAmount)
        }
    ], [groupedData, chartType]);

    // Optimize: Memoize change handlers
    const handleChartTypeChange = useCallback((newChartType: "line" | "bar") => {
        setChartType(newChartType);
    }, []);

    const handleDurationChange = useCallback((newDuration: number) => {
        setDuration(newDuration);
    }, []);

    return (
        <MainCard
            title="Timeline"
            icon={<ChartPieIcon />}
            navigations={[
                <div key="chart-type" className="flex space-x-1">
                    <Button
                        variant={chartType === "line" ? "solid" : "outline"}
                        size="sm"
                        onClick={() => handleChartTypeChange("line")}
                        className="px-3"
                    >
                        <ChartPieIcon className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={chartType === "bar" ? "solid" : "outline"}
                        size="sm"
                        onClick={() => handleChartTypeChange("bar")}
                        className="px-3"
                    >
                        <ChartBarIcon className="w-4 h-4" />
                    </Button>
                </div>
            ]}
        >
            <div>
                <div className="flex space-x-1 mb-4">
                    <Button
                        variant={duration === 7 ? "solid" : "outline"}
                        size="sm"
                        onClick={() => handleDurationChange(7)}
                        className="px-3"
                    >
                        WEEK
                    </Button>
                    <Button
                        variant={duration === 30 ? "solid" : "outline"}
                        size="sm"
                        onClick={() => handleDurationChange(30)}
                        className="px-3"
                    >
                        MONTH
                    </Button>
                    <Button
                        variant={duration === 365 ? "solid" : "outline"}
                        size="sm"
                        onClick={() => handleDurationChange(365)}
                        className="px-3"
                    >
                        YEAR
                    </Button>
                </div>
                
                <Chart
                    options={chartOptions}
                    series={chartSeries}
                    type={chartType}
                    height={300}
                />
            </div>
        </MainCard>
    );
};
