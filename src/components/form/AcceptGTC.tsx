import React, { useEffect, useState } from "react";
import Trans from "next-translate/Trans";
import useTranslation from "next-translate/useTranslation";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectPayment, setGtcAccepted } from "../../store/reducers/paymentReducer";
import { Dialog, Switch } from "../../ui";

export const AcceptGTC = () => {
    const payment = useAppSelector(selectPayment);
    const dispatch = useAppDispatch();
    const [open, setOpen] = useState<string | null>(null);
    const [data, setData] = useState<Record<string, string>>({});
    const [type, setType] = useState<string | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        if (open === null || data[open]) return;
        const loadData = async () => {
            const response = await axios.get("/api/gtc?type=" + open, {
                responseType: "blob"
            });
            setType(response.headers["content-type"]);
            setData((oldData) => ({ ...oldData, [open]: URL.createObjectURL(response.data) }));
        };
        loadData().catch(console.log);
    }, [open, data]);

    let objectElement;
    if (open !== null) {
        const css = document.createElement("style");
        css.append(document.createTextNode(`body { font-family: system-ui, -apple-system, sans-serif; }`));
        objectElement = (
            <object 
                data={data[open]} 
                type={type} 
                className="h-full w-full" 
                onLoad={(event) => event.currentTarget.contentDocument?.head.appendChild(css)} 
            />
        );
    }

    return (
        <>
            <Dialog open={open !== null} onClose={() => setOpen(null)} size="full">
                <Dialog.Header>
                    <div className="flex items-center space-x-3">
                        <h2 className="text-xl font-semibold">
                            {open === "gtc" ? t("payment:gtc-header") : t("payment:privacy-header")}
                        </h2>
                    </div>
                </Dialog.Header>
                <Dialog.Body>
                    {objectElement}
                </Dialog.Body>
            </Dialog>
            
            <div className="space-y-2">
                <div className="flex items-center space-x-3">
                    <Switch
                        checked={payment.gtcAccepted}
                        onChange={(checked) => dispatch(setGtcAccepted(checked))}
                    />
                    <label className="text-sm text-gray-700">
                        <Trans
                            i18nKey="payment:accept-gtc"
                            components={{
                                linkGTC: (
                                    <button
                                        onClick={(event) => {
                                            event.preventDefault();
                                            setOpen("gtc");
                                        }}
                                        className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                    />
                                ),
                                linkPrivacy: (
                                    <button
                                        onClick={(event) => {
                                            event.preventDefault();
                                            setOpen("privacy");
                                        }}
                                        className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                    />
                                )
                            }}
                        />
                    </label>
                </div>
                
                {/* Warning message when terms are not accepted */}
                {!payment.gtcAccepted && (
                    <div className="flex items-center space-x-2 text-amber-600 text-sm">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>⚠️ You must accept the terms and conditions to proceed with payment</span>
                    </div>
                )}
            </div>
        </>
    );
};
