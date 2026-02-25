import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../components/admin/layout";
import { getAdminServerSideProps } from "../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../constants/interfaces";

export default function TicketScanPage() {
    const { data: session, status } = useSession();

    // Only show loading during genuine session loading, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading ticket scanner...</div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="pb-5 space-y-1">
                <h1 className="text-2xl font-bold pl-2">Ticket Scanner</h1>
                <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-gray-600">Ticket scanner functionality coming soon.</p>
                </div>
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            return {
                props: {}
            };
        },
        {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        }
    );
}
