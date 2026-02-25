import { AdminLayout } from "../../components/admin/layout";
import { getAdminServerSideProps } from "../../constants/serverUtil";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import CSVImportWizard from "../../components/admin/import/CSVImportWizard";

export default function ImportCiviCRMPage({ permissionDenied }) {
    if (permissionDenied) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
                    <p className="text-gray-600 mt-2">You don&apos;t have permission to access this page.</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Import CiviCRM Data</h1>
                    <p className="text-gray-600 mt-2">
                        Import historic events, users, and orders from CiviCRM CSV export
                    </p>
                </div>
                
                <CSVImportWizard />
            </div>
        </AdminLayout>
    );
}

export const getServerSideProps = async (context) => {
    return getAdminServerSideProps(
        context,
        async () => {
            return { props: {} };
        },
        {
            permission: PermissionSection.EventManagement,
            permissionType: PermissionType.Write
        }
    );
};
