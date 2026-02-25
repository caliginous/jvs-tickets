import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../components/admin/layout";

import { getAdminServerSideProps } from "../../../constants/serverUtil";
import prisma from "../../../lib/prisma";
import { useState } from "react";
import { useRouter } from "next/router";
import { PencilIcon, PlusIcon } from "@heroicons/react/solid";
import { SeatMapDialog } from "../../../components/admin/dialogs/SeatMapDialog";
import { showToast } from "../../../ui/toast";
import axios from "axios";
import { PermissionSection, PermissionType } from "../../../constants/interfaces";
import { getOption } from "../../../lib/options";
import { Options } from "../../../constants/Constants";

export default function SeatMaps({ seatmaps, categories, permissionDenied, currency }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [seatmap, setSeatmap] = useState(null);

    // Only show loading spinner during initial session load, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading seat maps...</div>
                </div>
            </AdminLayout>
        );
    }

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    const handleAdd = async () => {
        try {
            await axios.post("/api/admin/seatmap");
            await refreshProps();
        } catch (e) {
            showToast.error("Error");
        }
    };

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <SeatMapDialog
                seatmap={seatmap}
                categories={categories}
                onClose={() => setSeatmap(null)}
                onChange={refreshProps}
                currency={currency}
            />
            <div className="pb-5">
                <h1 className="text-2xl font-semibold text-gray-900">Seat Maps</h1>
            </div>
            <div>
                <div className="flex">
                    <div className="flex-grow" />
                    <button
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                        onClick={handleAdd}
                    >
                        <PlusIcon className="w-4 h-4" /> Add Seat Map
                    </button>
                </div>
                <div>
                    {(seatmaps?.length ?? 0) === 0 ? (
                        <p className="text-gray-900">No Seat Maps</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Events using map</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {seatmaps.map((seatmap, index) => {
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {seatmap.events.map(
                                                    (event, index) => (
                                                        <p key={index} className="text-sm text-gray-900">
                                                            {event.title}
                                                        </p>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                                    onClick={() =>
                                                        setSeatmap(seatmap)
                                                    }
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            const seatmaps = (await prisma.seatMap.findMany({
                select: {
                    events: true,
                    definition: true,
                    id: true,
                    preview: true
                }
            })).map(seatmap => ({...seatmap, preview: null, containsPreview: seatmap.preview !== null}));
            const categories = await prisma.category.findMany();
            return {
                props: {
                    seatmaps,
                    categories,
                    currency: await getOption(Options.Currency)
                }
            };
        },
        {
            permission: PermissionSection.EventSeatMaps,
            permissionType: PermissionType.Read
        }
    );
}
