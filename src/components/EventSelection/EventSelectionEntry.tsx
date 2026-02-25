import styles from "../../style/EventSelection.module.scss";
import Link from "next/link";
import { formatInTZ } from "../../utils/datetime";

interface Props {
    label: string;
    name: string;
    index: number;
    onChange?: (index: number) => unknown;
}

export const EventSelectionEntry = (props: Props) => {
    return (
        <div className={styles.eventSelection}>
            <Link 
                href={`/booking/${props.index}`}
                className="flex cursor-pointer no-underline"
            >
                <div className="flex w-full">
                    <div className="bg-blue-100 rounded-l-lg p-2 hover:bg-blue-200 transition-colors">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </div>
                    <div className="bg-gray-100 rounded-r-lg p-2 flex-1 hover:bg-gray-200 transition-colors">
                        {props.label}
                    </div>
                </div>
            </Link>
        </div>
    );
};

interface EventSelectionMultipleProps {
    dates: any[];
    onChange: (index: number) => void;
    label: string;
}

export const EventSelectionMultiple = ({ dates, onChange, label }: EventSelectionMultipleProps) => {
    return (
        <div className="border border-gray-200 rounded-lg">
            <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 list-none">
                    <span className="text-base font-medium text-gray-900">{label}</span>
                    <div className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform">
                        ▼
                    </div>
                </summary>
                <div className="px-4 pb-4 border-t border-gray-200 space-y-2">
                    {dates.map(date => {
                        let title = date.title ?? label;
                        if (date.date) {
                            title += ` (${formatInTZ(date.date, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }, 'Europe/London', 'en-GB')})`;
                        }
                        return (
                            <EventSelectionEntry
                                label={title}
                                name={"event_selection"}
                                key={date.id}
                                index={date.id}
                                onChange={() => {}}
                            />
                        );
                    })}
                </div>
            </details>
        </div>
    );
};
