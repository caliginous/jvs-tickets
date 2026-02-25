import { GetServerSideProps } from 'next';
import { getAdminServerSideProps } from '../../../constants/serverUtil';
import { AdminLayout } from '../../../components/admin/layout';
import { SlugManagement } from '../../../components/admin/SlugManagement';
import { PermissionSection, PermissionType } from '../../../constants/interfaces';

interface SlugsPageProps {
    permissionDenied: boolean;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    return getAdminServerSideProps(context, async () => {
        // No additional data needed for slug management
        return {};
    }, {
        permission: PermissionSection.EventManagement,
        permissionType: PermissionType.Read
    });
};

export default function SlugsPage({ permissionDenied }: SlugsPageProps) {
    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Slug Management</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Manage URL slugs for events. Slugs make event URLs more readable and SEO-friendly.
                    </p>
                </div>

                <SlugManagement />
            </div>
        </AdminLayout>
    );
}
