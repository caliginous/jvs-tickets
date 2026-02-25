import { SeatRow, SeatSelectionRow } from "./SeatSelectionRow";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
    OrderState,
    selectOrder, setTickets
} from "../../../store/reducers/orderReducer";
import { useCallback, useEffect, useRef, useState } from "react";
import { Seat } from "./SeatMapSeat";
import { PaymentOverview } from "../../PaymentOverview";
import { EyeIcon } from "@heroicons/react/solid";
import { SeatMapPreview } from "./SeatMapPreview";

export type SeatMap = Array<SeatRow>;

const getDimensions = (element: HTMLDivElement) => {
    const computedStyle = getComputedStyle(element);
    let elementHeight = element.clientHeight;
    let elementWidth = element.clientWidth;

    elementHeight -= parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
    elementWidth -= parseFloat(computedStyle.paddingLeft) + parseFloat(computedStyle.paddingRight);

    return { width: elementWidth, height: elementHeight };
};

interface SeatSelectionMapProps {
    seatSelectionDefinition: SeatMap;
    categories: Array<{
        id: number;
        label: string;
        price: number;
    }>;
    hideSummary?: boolean;
    seatMapId?: number;
    containsPreview?: boolean;
    currency: string;
}

export const SeatSelectionMap = ({
    seatSelectionDefinition,
    categories,
    hideSummary,
    seatMapId,
    containsPreview,
    currency
}: SeatSelectionMapProps) => {
    const order = useAppSelector(selectOrder) as OrderState;
    const dispatch = useAppDispatch();
    const container = useRef<HTMLDivElement>(null);
    const content = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState<number>(1);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [isLgDown, setIsLgDown] = useState(false);
    const ref = useRef<ReactZoomPanPinchRef>(null);

    // Custom media query hook replacement
    useEffect(() => {
        const checkMediaQuery = () => {
            setIsLgDown(window.innerWidth < 1024); // lg breakpoint
        };
        
        checkMediaQuery();
        window.addEventListener("resize", checkMediaQuery);
        return () => window.removeEventListener("resize", checkMediaQuery);
    }, []);

    const rescale = useCallback(() => {
        if (!content.current || !container.current) return;
        const { width: maxWidth, height: maxHeight } = getDimensions(container.current);
        const { width, height } = getDimensions(content.current);
        setScale(Math.min(maxWidth / width, maxHeight / height));
    }, [content, container]);

    useEffect(() => {
        if (!ref.current) return;
        ref.current.centerView(scale);
    }, [scale, ref]);

    useEffect(() => {
        rescale();
    }, [container, content, rescale]);

    useEffect(() => {
        window.addEventListener("resize", rescale);
        return () => {
            window.removeEventListener("resize", rescale);
        };
    }, [rescale]);

    const createNewOrder = (): OrderState => {
        return {
            orderId: order.orderId,
            tickets: order.tickets.map((a) => a),
            ticketPersonalizationRequired: order.ticketPersonalizationRequired,
            reservationId: order.reservationId,
            reservationExpiresAt: order.reservationExpiresAt
        };
    };

    const addSeat = (seat: Seat) => {
        const newOrder: OrderState = createNewOrder();
        const category = categories.find(c => c.id === seat.category);
        if (category) {
            newOrder.tickets.push({
                categoryId: seat.category,
                amount: seat.amount ?? 1,
                seatId: seat.id,
                price: category.price
            });
        }
        dispatch(setTickets(newOrder.tickets));
    };

    const removeSeat = (seat: Seat) => {
        const newOrder: OrderState = createNewOrder();
        newOrder.tickets.splice(
            newOrder.tickets.findIndex((s) => s.seatId === seat.id),
            1
        );
        dispatch(setTickets(newOrder.tickets));
    };

    const handleSelectSeat = (seat: Seat, indexInRow: number, isSelected: boolean) => {
        if (isSelected) {
            addSeat(seat);
            return;
        }
        removeSeat(seat);
    };

    return (
        <>
            <SeatMapPreview open={previewOpen} onClose={() => setPreviewOpen(false)} id={seatMapId} />
            <div className="grid grid-cols-1 lg:grid-cols-12 h-full max-h-full">
                <div
                    className={`lg:col-span-8 relative w-full ${
                        isLgDown ? "px-0 py-2" : "p-2"
                    }`}
                    ref={container}
                >
                    <TransformWrapper centerOnInit centerZoomedOut minScale={scale} limitToBounds ref={ref}>
                        <TransformComponent wrapperStyle={{ width: "100%", height: isLgDown ? "500px" : "100%" }}>
                            <div
                                className="flex flex-col"
                                ref={content}
                            >
                                {seatSelectionDefinition.map((row, index) => (
                                    <SeatSelectionRow
                                        key={`row${index}`}
                                        row={row}
                                        categories={categories}
                                        onSelectSeat={handleSelectSeat}
                                        currency={currency}
                                    />
                                ))}
                            </div>
                        </TransformComponent>
                    </TransformWrapper>
                    
                    {(containsPreview && !isLgDown) && (
                        <button
                            className="absolute bottom-0 right-0 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors"
                            onClick={() => setPreviewOpen(true)}
                        >
                            <EyeIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
                
                {!hideSummary && (
                    <div className="lg:col-span-4 flex items-center relative">
                        <div className="flex-1 p-2">
                            <PaymentOverview categories={categories} displayColor />
                        </div>
                        
                        {(containsPreview && isLgDown) && (
                            <button
                                className="absolute top-0 right-0 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors z-10"
                                onClick={() => setPreviewOpen(true)}
                            >
                                <EyeIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};
