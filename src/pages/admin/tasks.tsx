import { useSession } from "next-auth/react";
import { AdminLayout } from "../../components/admin/layout";
import {
    getAdminServerSideProps
} from "../../constants/serverUtil";
import prisma from "../../lib/prisma";
import { useState } from "react";
import { useRouter } from "next/router";
import { PermissionSection, PermissionType } from "../../constants/interfaces";
import { AdminUser, Order, User, Task as TaskBase} from "@prisma/client";
import { ExternalLinkIcon, CheckIcon } from "@heroicons/react/solid";
import axios from "axios";
import { showToast } from "../../ui";
import { ManageTaskDialog } from "../../components/admin/dialogs/ManageTaskDialog";
import { getTaskType } from "../../constants/orderValidation";
import { SaveButton } from "../../components/admin/SaveButton";

interface Task extends TaskBase {
    assignedUser: AdminUser;
    order: Order & {user: User};
}

export default function Tasks({ tasks, permissionDenied, categories }: {tasks: Array<Task>, permissionDenied: boolean, categories: any}) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [task, setTask] = useState<Task | null>(null);

    // Only show loading spinner during initial session load, not on tab switches
    if (status === "loading") {
        return (
            <AdminLayout permissionDenied={permissionDenied}>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="ml-3 text-gray-600">Loading tasks...</div>
                </div>
            </AdminLayout>
        );
    }

    const refreshProps = async () => {
        await router.replace(router.asPath);
    };

    const checkTask = async (task: Task) => {
        try {
            if (getTaskType(task) === "payment") {
                await axios.put("/api/admin/order/paid?orderId=" + task.order.id);
            }
            else if (getTaskType(task) === "shipping") {
                await axios.put("/api/admin/order/shipped?orderId=" + task.order.id);
            }
            await refreshProps();
        } catch (e) {
            showToast.error("Error: " + (e.response?.message ?? e.message));
        }
    }

    return (
        <AdminLayout permissionDenied={permissionDenied}>
            <ManageTaskDialog task={task} onClose={async () => {
                setTask(null)
                await refreshProps();
            }} categories={categories} />
            <div className="pb-5">
                <h1 className="text-2xl font-bold">Tasks</h1>
            </div>
            <div>
                {(tasks?.length ?? 0) === 0 ? (
                    <p className="text-base text-gray-900">
                        No tasks available yet
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Task</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Open</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {tasks.map((task, index) => {
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.order.user.firstName} {task.order.user.lastName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.order.user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getTaskType(task) === "shipping" ? "Ship tickets" : "Check payment receipt"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div title="Mark current step of this task as completed">
                                                    <SaveButton
                                                        action={async () => await checkTask(task)}
                                                        className="task-check"
                                                    >
                                                        <CheckIcon className="w-4 h-4" />
                                                    </SaveButton>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <button
                                                    onClick={() => setTask(task)}
                                                    className="task-open p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                                >
                                                    <ExternalLinkIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

export async function getServerSideProps(context) {
    return await getAdminServerSideProps(
        context,
        async () => {
            let tasks = await prisma.task.findMany({
                include: {
                    assignedUser: true,
                    order: {
                        include: {
                            user: true,
                            tickets: {
                                include: {
                                    eventTicketType: true
                                }
                            }
                        }
                    }
                }
            });
            const tasksSerializable = tasks.map(task => {
                return {
                    ...task,
                    notes: JSON.parse(task.notes),
                    ...{
                        order: {
                            ...task.order,
                            date: task.order.date.toISOString()
                        }
                    }
                }
            });
            return {
                props: {
                    tasks: tasksSerializable,
                    categories: [] // Categories deprecated - use ticket types
                }
            };
        },
        {
            permission: PermissionSection.Orders,
            permissionType: PermissionType.Read
        }
    );
}
