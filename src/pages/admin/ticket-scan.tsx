
import { QrReader } from 'react-qr-reader';
import { ArrowLeftIcon, CogIcon, CheckIcon, XIcon } from "@heroicons/react/solid";
import {useRouter} from "next/router";
import {useEffect, useRef, useState} from "react";
import axios from "axios";
import { getAdminServerSideProps } from "../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import style from "../../style/TicketScan.module.scss";
import { decodeTicketQR } from "../../constants/util";
import { Button, Dialog, Input, Select, Switch } from "../../ui";
import { showToast } from "../../ui";

export default function TicketScan({permissionDenied}){
    const router = useRouter();
    const isError = useRef<boolean>(false);
    const [autoSend, setAutoSend] = useState(true);
    const autoSendRef = useRef(autoSend);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [ticket, setTicket] = useState(null);
    const ticketId = useRef<{id: string; secret: string;}>(null);
    const [deviceId, setDeviceId] = useState(null);
    const [devices, setDevices] = useState(null);

    useEffect(() => {
        if (!navigator.mediaDevices) return;
        navigator.mediaDevices.enumerateDevices().then((devices) => setDevices(devices));
    }, []);

    const onBack = () => {
        router.back();
    };

    const updateAutoSend = (value) => {
        autoSendRef.current = value;
        setAutoSend(value);
    };

    const closeTicketDetails = () => {
        ticketId.current = null;
        setTicket(null);
    }

    const accept = async () => {
        try {
            await axios.post("/api/admin/ticket/" + ticketId.current.id, {
                secret: ticketId.current.secret
            });
            showToast.success("Ticket accepted");
            setTicket(null);
        } catch (e) {
            if (e.response.status === 400) {
                showToast.success("Ticket already used");
                setTicket(null);
                return;
            }
            if (e.response.status === 404) {
                showToast.success("Ticket not found");
                setTicket(null);
                return;
            }
            if (e.response.status === 402) {
                showToast.error("Ticket Secret invalid");
                setTicket(null);
                return;
            }
            showToast.error("Error: " + (e?.response?.data ?? e.message))
        } finally {
            setTimeout(() => {
                ticketId.current = null;
            }, 500);
        }
    }

    const onScan = async (result, error) => {
        isError.current = error;
        if (error) return;
        if (ticketId.current) return;

        const parsedQR = decodeTicketQR(result.getText());
        if (!parsedQR.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
            ticketId.current = {id: "N/A", secret: ""};
            setTimeout(() => {
                ticketId.current = null;
            }, 1000)
            showToast.success("Scanned QR-Code is no ticket");
            return;
        }

        ticketId.current = parsedQR;
        if (autoSendRef.current) {
            await accept();
            return;
        }

        try {
            const ticket = await axios.get("/api/admin/ticket/" + ticketId.current.id);
            setTicket(ticket.data);
        } catch (e) {
            if (e.response.status === 404) {
                showToast.success("Ticket not found");
                return;
            }
            showToast.error("Error loading ticket information. You can enable auto accept tickets in settings.");
        }
    };

    if (permissionDenied)
        return (
            <p className="text-base text-gray-900">You don&apos;t have permission to access the Ticket Scan!</p>
        );

    return (
        <div>
            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
                <Dialog.Header onClose={() => setSettingsOpen(false)}>
                    <h2 className="text-xl font-semibold">Settings</h2>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="pt-2 pb-2 space-y-2">
                        <div>
                            <label htmlFor="options-devices-label" className="block text-sm font-medium text-gray-700 mb-2">Device</label>
                            <Select 
                                value={deviceId || ""} 
                                onChange={(value) => setDeviceId(value)}
                                options={devices?.filter((device) => device.kind === "videoinput").map((device) => ({
                                    value: device.deviceId,
                                    label: device.label ?? device.deviceId
                                })) || []}
                                placeholder="Select device"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={autoSend}
                                onChange={(checked) => updateAutoSend(checked)}
                            />
                            <label className="text-sm text-gray-700">Auto. Send Tickets</label>
                        </div>
                    </div>
                </Dialog.Body>
            </Dialog>
            <Dialog open={ticket !== null} onClose={closeTicketDetails}>
                <Dialog.Header>
                    <h2 className="text-xl font-semibold">Ticket</h2>
                </Dialog.Header>
                <Dialog.Body>
                    {
                        ticket && (
                            <div className="space-y-2">
                                <p className="flex items-center space-x-2">
                                    <span>Ticket used:</span>
                                    {ticket.used ? <XIcon className="w-5 h-5 text-red-500" /> : <CheckIcon className="w-5 h-5 text-green-500" />}
                                </p>
                                <p>Name: {ticket.order.user.firstName} {ticket.order.user.lastName}</p>
                                <p>Ticket-Id: {ticket.id}</p>
                            </div>
                        )
                    }
                </Dialog.Body>
                <Dialog.Footer>
                    <Button variant="outline" onClick={closeTicketDetails}>
                        Cancel
                    </Button>
                    <Button onClick={accept}>
                        Accept
                    </Button>
                </Dialog.Footer>
            </Dialog>
            <div style={{width: "100%", height: "100%", overflow: "hidden", position: "absolute"}}>
                <video id={"video"} style={{
                    minWidth: "100%",
                    minHeight: "100%",
                    transform: "translateX(-50%) translateY(-50%)",
                    height: "auto",
                    width: "auto",
                    top: "50%",
                    left: "50%",
                    position: "absolute"
                }} />
            </div>
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    backgroundColor: "rgba(255, 255, 255, 0.7)"
                }}
            >
                <button
                    onClick={onBack}
                    className="p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setSettingsOpen(true)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
                >
                    <CogIcon className="w-5 h-5" />
                </button>
            </div>
            <div id={style.qrMarker}><div /></div>
            <QrReader
                constraints={!deviceId ? {facingMode: "environment"} : {deviceId}}
                videoId={"video"}
                onResult={onScan}
                key={deviceId ?? "default"}
            />
            <div
                style={{
                    position: "absolute",
                    left: "5%",
                    bottom: 20,
                    width: "90%",
                    backgroundColor: "rgba(128, 128, 128, 0.7)",
                    borderRadius: "4px",
                    padding: "4px"
                }}
            >
                <p className="text-center text-white">Please center the QR-Code of the ticket in the cameras viewport</p>
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    return getAdminServerSideProps(
        context,
        async () => {
            return { props: {} };
        },
        {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        }
    );
}
