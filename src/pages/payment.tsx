
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useRouter } from "next/router";
import { PaymentMethods } from "../components/payment/PaymentMethods";
import { selectPayment, setPaymentStatus } from "../store/reducers/paymentReducer";
import prisma from "../lib/prisma";
import { PaymentFactory } from "../store/factories/payment/PaymentFactory";
import { PaymentOverview } from "../components/PaymentOverview";
import { PayButton } from "../components/payment/button/PayButton";
import { getOption } from "../lib/options";
import { Options } from "../constants/Constants";
import loadNamespaces from "next-translate/loadNamespaces";
import { selectEventSelected } from "../store/reducers/eventSelectionReducer";
import { getEventTitle } from "../constants/util";
import { AcceptGTC } from "../components/form/AcceptGTC";
import { Button, Dialog, Card } from "../ui";

export default function Payment({ categories, paymentMethods, paymentFees, shippingFees, events }) {
    const payment = useAppSelector(selectPayment);
    const selectedEventId = useAppSelector(selectEventSelected);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [eventTitle, setEventTitle] = useState<string | null>(null);

    const [isMdUp, setIsMdUp] = useState(false);

    useEffect(() => {
        const checkMediaQuery = () => {
            setIsMdUp(window.innerWidth >= 768); // md breakpoint
        };
        
        checkMediaQuery();
        window.addEventListener('resize', checkMediaQuery);
        return () => window.removeEventListener('resize', checkMediaQuery);
    }, []);

    const containerStyling: React.CSSProperties = isMdUp
        ? { flexWrap: "nowrap" }
        : {
              flexDirection: "column-reverse",
              overflowY: "auto",
              flexWrap: "nowrap"
          };

    useEffect(() => {
        if (payment.state !== "finished") return;
        router.push("/checkout").catch(console.log);
    }, [payment, router]);

    useEffect(() => {
        setEventTitle(getEventTitle(events.find(e => e.id === selectedEventId)));
    }, [events, selectedEventId]);

    const openBookingPage = () => {
        router.push("/booking/" + selectedEventId).catch(console.log);
    };

    return (
        <div className="min-h-screen flex justify-center items-center">
            <Dialog open={payment.state === "failure"} onClose={() => dispatch(setPaymentStatus("none"))}>
                <Dialog.Header>
                    <h2 className="text-xl font-semibold">Payment failed!</h2>
                </Dialog.Header>
                <Dialog.Body>
                    <p className="text-gray-700">
                        An error occurred while processing your payment.
                        Please try again, choose a different payment method
                        or contact us!
                    </p>
                </Dialog.Body>
                <Dialog.Footer>
                    <Button
                        variant="outline"
                        onClick={() => dispatch(setPaymentStatus("none"))}
                    >
                        Close
                    </Button>
                </Dialog.Footer>
            </Dialog>
            
            <div
                className="flex gap-4"
                style={{ ...containerStyling, maxHeight: "100%" }}
            >
                <div
                    className="w-full lg:w-2/3"
                    style={{
                        maxHeight: "100%",
                        display: "flex",
                        alignItems: "center"
                    }}
                >
                    <div
                        style={{
                            maxHeight: "100%",
                            overflowY: "auto",
                            padding: "2px 5px",
                            width: "100%"
                        }}
                    >
                        <Card>
                            <PaymentMethods paymentMethods={paymentMethods} paymentFees={paymentFees} />
                        </Card>
                    </div>
                </div>
                <div
                    className="w-full lg:w-1/3 flex items-center"
                    style={{ paddingLeft: "21px", marginRight: "5px" }}
                >
                    <Card className="flex-1 p-2.5">
                        <PaymentOverview
                            categories={categories}
                            hideEmptyCategories
                            withEditButton
                            onEdit={openBookingPage}
                            paymentFees={paymentFees}
                            shippingFees={shippingFees}
                            eventName={eventTitle}
                        />
                        <AcceptGTC />
                        {PaymentFactory.getPaymentInstance(
                            payment.payment
                        )?.getPaymentButton() ?? <PayButton />}
                    </Card>
                </div>
            </div>
        </div>
    );
}

export async function getStaticProps({ locale }) {
    // Get all ticket types to use as categories
    const ticketTypes = await prisma.eventTicketType.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            price: true,
            colorHex: true
        }
    });
    
    // Transform ticket types to categories format for compatibility
    const categories = ticketTypes.map(tt => ({
        id: tt.id,
        label: tt.name,
        price: tt.price / 100,
        color: tt.colorHex || '#4F46E5'
    }));
    
    const paymentMethods = await getOption(Options.PaymentProviders);
    const events = await prisma.eventDate.findMany({
        select: {
            title: true,
            event: {
                select: {
                    title: true
                }
            },
            id: true
        }
    });

    return {
        props: {
            disableOverflow: true,
            noNext: true,
            categories: categories,
            paymentMethods,
            paymentFees: await getOption(Options.PaymentFeesPayment),
            shippingFees: await getOption(Options.PaymentFeesShipping),
            theme: await getOption(Options.Theme),
            ...(await loadNamespaces({ locale, pathname: '/payment' })),
            events,
            impressUrl: await getOption(Options.ImpressUrl)
        }
    };
}
