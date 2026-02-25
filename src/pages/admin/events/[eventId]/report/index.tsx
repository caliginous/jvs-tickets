import { useSession } from "next-auth/react";
import { AdminLayout } from "../../../../../components/admin/layout";
import { getAdminServerSideProps } from "../../../../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../../../../constants/interfaces";

export default function EventReportPage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading event report...</div>
                </div>
            </AdminLayout>
        );
    }

    // Handle both JWT mode (session has user data directly) and database mode (session.user exists)
    const hasValidSession = session && (
        session.user || // Database mode
        ((session as any).name && (session as any).email) // JWT mode
    );
    
    if (!hasValidSession) {
        return null;
    }

    return (
        <AdminLayout>
            <div className="pb-5 space-y-1">
                <h1 className="text-2xl font-bold pl-2">Event Report</h1>
                <div className="bg-white p-6 rounded-lg shadow">
                    <p className="text-gray-600">Event report functionality coming soon.</p>
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
            permission: PermissionSection.EventManagement,
            permissionType: PermissionType.Read
        }
    );
}
