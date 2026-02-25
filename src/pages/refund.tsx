import { SelectionList } from "../components/admin/SelectionList";
import { useEffect, useState, useCallback } from "react";

import { getOption } from "../lib/options";
import { Options } from "../constants/Constants";
import loadNamespaces from "next-translate/loadNamespaces";
import { formatPrice } from "../constants/util";
import useTranslation from "next-translate/useTranslation";
import { useRouter } from "next/router";
import axios from "axios";
import { SuccessAnimated } from "../components/SuccessAnimated";
import { InformationCircleIcon } from "@heroicons/react/solid";
import { SaveButton } from "../components/admin/SaveButton";
import { Button, Card, Dialog } from "../ui";

export default function Payment({currency}) {
    const router = useRouter();
    const {t} = useTranslation("refund");
    const [ticketList, setTicketList] = useState([]);
    const [selection, setSelection] = useState<any[]>([]);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);

    const getURL = useCallback(() => {
        const query = new URLSearchParams({
            ...(router.query.orderId && ({orderId: router.query.orderId as string})),
            ...(router.query.secret && ({secret: router.query.secret as string}))
        });
        return `/api/cancellation?${query}`;
    }, [router.query.orderId, router.query.secret]);

    useEffect(() => {
        if (!router.isReady) return;
        const loadData = async () => {
            try {
                const response = await axios.get(getURL());
                const tickets = response.data.map(ticket => ({
                    primaryLabel: ticket.category.label,
                    secondaryLabel: ticket.seatId && t("common:seat", {seat: ticket.seatId}),
                    value: ticket.id,
                    additionalNode: formatPrice(ticket.category.price, currency),
                    price: ticket.category.price
                }));
                setTicketList(tickets);
            } catch (e) {
                if (e.response.status === 404) {
                    setError({
                        title: "not-found-title",
                        content: "not-found-content"
                    })
                }
                else if (e.response.status === 401) {
                    setError({
                        title: "unauthorized-title",
                        content: "unauthorized-content"
                    })
                }
                else if (e.response.status === 400) {
                    setError({
                        title: "parameter-missing-title",
                        content: "parameter-missing-content"
                    })
                }
            } finally {
                setLoading(false);
            }
        };

        loadData().catch(console.log);
    }, [router.isReady, router.query, currency, getURL, t]);

    const handleSend = async () => {
        await axios.post(getURL(), {
            tickets: selection
        });
        setConfirmOpen(false);
        setSubmitted(true);
    }

    const totalRefundAmount = ticketList
        .filter(t => selection.includes(t.value))
        .reduce((agg, val) => agg + val.price, 0);

    const [isLgUp, setIsLgUp] = useState(false);

    useEffect(() => {
        const checkMediaQuery = () => {
            setIsLgUp(window.innerWidth >= 1024); // lg breakpoint
        };
        
        checkMediaQuery();
        window.addEventListener('resize', checkMediaQuery);
        return () => window.removeEventListener('resize', checkMediaQuery);
    }, []);

    return (
        <>
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <Dialog.Header>
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">{t("confirm-title")}</h2>
                        <div className="relative">
                            <div className="relative group">
                                <InformationCircleIcon 
                                    className="w-5 h-5 text-blue-600"
                                />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {t("confirm-info")}
                                </div>
                            </div>
                        </div>
                    </div>
                </Dialog.Header>
                <Dialog.Body>
                    <div dangerouslySetInnerHTML={{__html: t("confirm-description")}} />
                </Dialog.Body>
                <Dialog.Footer>
                    <Button onClick={() => setConfirmOpen(false)}>{t("confirm-cancel")}</Button>
                    <SaveButton action={handleSend}>{t("confirm-accept")}</SaveButton>
                </Dialog.Footer>
            </Dialog>
            <div
                className="flex justify-center items-center h-full"
                style={{
                    backgroundImage: `linear-gradient(138deg, #22c55e, #3b82f6)`
                }}
            >
                <div className={`${isLgUp ? 'w-1/2' : 'w-full'} p-2`}>
                    <Card className="rounded-xl">
                        <div className="space-y-4 p-2 max-h-[calc(90vh-70px)]">
                            {
                                submitted ? (
                                    <>
                                        <SuccessAnimated style={{alignSelf: "center"}} />
                                        <h1 className="text-xl font-semibold text-center text-gray-900">
                                            {t("canceled-successfully")}
                                        </h1>
                                    </>
                                ) : (
                                    <>
                                        {
                                            loading && (
                                                <>
                                                    <div className="flex justify-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                    </div>
                                                    <p className="text-center text-gray-900">
                                                        {t("loading-order")}
                                                    </p>
                                                </>
                                            )
                                        }
                                        {
                                            !error && ticketList && !loading && (
                                                <>
                                                    <h2 className="text-2xl font-semibold text-center text-gray-900">
                                                        {t("title")}
                                                    </h2>
                                                    <h3 className="text-lg text-center text-gray-700">
                                                        {t("subtitle")}
                                                    </h3>
                                                    <SelectionList
                                                        options={ticketList}
                                                        selection={selection}
                                                        onChange={newSelection => setSelection(newSelection)}
                                                        header={null}
                                                    />
                                                    <p className="text-center text-gray-900" dangerouslySetInnerHTML={{__html: t("amount-of-refund", {amount: formatPrice(totalRefundAmount, currency)})}} />
                                                    {
                                                        selection.length === ticketList.length && (
                                                            <p className="text-center text-gray-700">
                                                                {t("cancel-whole-order")}
                                                            </p>
                                                        )
                                                    }
                                                    <Button variant={"danger"} disabled={totalRefundAmount <= 0} onClick={() => setConfirmOpen(true)}>
                                                        {t("submit")}
                                                    </Button>
                                                </>
                                            )
                                        }
                                        {
                                            error && !loading && (
                                                <>
                                                    <h2 className="text-2xl font-semibold text-center text-gray-900">
                                                        {t(error.title)}
                                                    </h2>
                                                    <h3 className="text-lg text-center text-gray-700">
                                                        {t(error.content)}
                                                    </h3>
                                                </>
                                            )
                                        }
                                    </>
                                )
                            }
                        </div>
                    </Card>
                </div>
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
                {/* Language selector removed - defaulting to British English */}
            </div>
        </>
    );
}

export async function getStaticProps({ locale }) {
    return {
        props: {
            currency: await getOption(Options.Currency),
            ...(await loadNamespaces({ locale, pathname: '/refund' }))
        }
    };
}