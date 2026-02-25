
import { getOption } from "../lib/options";
import { Options } from "../constants/Constants";
import loadNamespaces from "next-translate/loadNamespaces";
import useTranslation from "next-translate/useTranslation";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { useAppSelector } from "../store/hooks";
import { selectPayment } from "../store/reducers/paymentReducer";
import { selectOrder } from "../store/reducers/orderReducer";
import { SuccessAnimated } from "../components/SuccessAnimated";
import { Button } from "../components/ui";

export default function Checkout() {
    const { t } = useTranslation();
    const router = useRouter();
    const notificationSent = useRef(false);
    const paymentSelector = useAppSelector(selectPayment);
    const orderSelector = useAppSelector(selectOrder);

    useEffect(() => {
        if (!router.isReady || notificationSent.current) return;

        notificationSent.current = true;
        const {order: orderId, payment} = router.query;
        axios.post("/api/order/checkout_complete_notification", {
            orderId: orderSelector.orderId ?? orderId,
            payment: paymentSelector.payment.type ?? payment
        }).catch(console.log);
    }, [router, orderSelector.orderId, paymentSelector.payment?.type]);

    const handleBackToStart = async () => {
        await router.push("/");
    }

    return (
        <div className="flex flex-col justify-center items-center space-y-4 min-h-screen">
            <SuccessAnimated />
            <h1 className="text-2xl font-bold text-center text-gray-900">
                {t("checkout:checkout-complete")}
            </h1>
            <Button onClick={handleBackToStart} variant="secondary" id="back-to-start">
                {t("checkout:back-to-start")}
            </Button>
        </div>
    );
}

export async function getStaticProps({ locale }) {
    return {
        props: {
            theme: await getOption(Options.Theme),
            ...(await loadNamespaces({ locale, pathname: '/checkout' })),
            impressUrl: await getOption(Options.ImpressUrl)
        }
    }
}
