import { Dialog, Button, Input } from "../../../ui";
import { useEffect, useState } from "react";
import { XIcon } from "@heroicons/react/solid";
import axios from "axios";
import { ConfirmDialog } from "./ConfirmDialog";
import { showToast } from "../../../ui";
import { SelectionList } from "../SelectionList";
import { PermissionSection } from "../../../constants/interfaces";
import { arrayEquals } from "../../../constants/util";
import * as Yup from "yup";
import { useFormik } from "formik";

interface props {
    open: boolean;
    user?: any;
    onClose?: () => unknown;
    onDelete?: () => unknown;
    onChange?: () => unknown;
    editRights?: boolean;
}

export const ManageUserDialog = ({ open, user, onClose, onDelete, onChange, editRights }: props) => {
    const [deleteOpen, setDeleteOpen] = useState(false);

    const schema = Yup.object().shape({
        username: Yup.string().required("Username is required"),
        email: Yup.string()
            .email("Email must be a valid email address")
            .required("Email is required"),
        ...(!user && ({
            password: Yup.string().required("Password is required"),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref("password")], "Passwords must be equal")
                .required("Please confirm the password"),
        })),
        ...(editRights && ({
            readRights: Yup.array().of(Yup.string()),
            writeRights: Yup.array().of(Yup.string())
        }))
    });

    const formik = useFormik({
        initialValues: {
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            readRights: [],
            writeRights: []
        },
        validationSchema: schema,
        onSubmit: async (values) => {
            try {
                const data = Object.assign({}, values);
                if (!editRights) {
                    delete data.readRights;
                    delete data.writeRights;
                }
                if (user) {
                    delete data.password;
                    delete data.confirmPassword;
                }
                if (user)
                    await axios.put("/api/admin/user/" + user.id, data);
                else
                    await axios.post("/api/admin/user", data)
                onClose();
                onChange();
            } catch (e) {
                showToast.error("Error: " + (e.response.data ?? e.message));
            }
        }
    });

    const { errors, touched, isSubmitting, handleSubmit, getFieldProps, values, setFieldValue, resetForm } =
        formik;

    useEffect(() => {
        if (!user) {
            resetForm();
            setDeleteOpen(false);
            return;
        }
        setFieldValue("email", user.email);
        setFieldValue("username", user.userName);
        setFieldValue("readRights", user.readRights);
        setFieldValue("writeRights", user.writeRights);
    }, [user, resetForm, setFieldValue]);

    const handleCloseDeleteUser = () => {
        setDeleteOpen(false);
    };

    const handleDeleteUser = async () => {
        try {
            await axios.delete("/api/admin/user/" + user.id);
            handleCloseDeleteUser();
            onClose();
            onDelete();
        } catch (e) {
            showToast.error("Error: " + (e.reponse.data ?? e.message));
        }
    };

    console.log(errors);

    const hasChanges =
        values.email !== user?.email ||
        values.username !== user?.userName ||
        !arrayEquals(user?.writeRights, values.writeRights) ||
        !arrayEquals(user?.readRights, values.readRights);

    return (
        <>
            <Dialog open={open || user} onClose={onClose} size="lg">
                <Dialog.Header>
                    <h3 className="text-lg font-semibold">
                        {user ? "Edit user" : "Add user"}
                    </h3>
                </Dialog.Header>
                <Dialog.Body>
                    <div className="space-y-4 py-2">
                        <Input
                            label="Username"
                            {...getFieldProps("username")}
                            error={touched.username && errors.username}
                        />
                        <Input
                            {...getFieldProps("email")}
                            label="E-Mail"
                            error={touched.email && errors.email}
                        />
                        {
                            !user && (
                                <>
                                    <Input
                                        label="Password"
                                        type="password"
                                        {...getFieldProps("password")}
                                        error={touched.password && errors.password}
                                    />
                                    <Input
                                        label="Confirm Password"
                                        type="password"
                                        {...getFieldProps("confirmPassword")}
                                        error={touched.confirmPassword && errors.confirmPassword}
                                    />
                                </>
                            )
                        }
                        {
                            editRights && (
                                <div className="flex space-x-4 max-h-80 overflow-auto">
                                    <SelectionList
                                        options={Object.values(PermissionSection).filter(x => x !== "none").map(permission => {
                                            return {
                                                value: permission,
                                                primaryLabel: permission.replace(/([A-Z])/g, ' $1')
                                            };
                                        })}
                                        selection={values.readRights}
                                        onChange={(newValue) => setFieldValue("readRights", newValue)}
                                        header={"Read Rights"}
                                        style={{
                                            flexGrow: 1,
                                            overflow: "visible",
                                            height: "fit-content"
                                        }}
                                    />
                                    <SelectionList
                                        options={Object.values(PermissionSection).filter(x => x !== "none").map(permission => {
                                            return {
                                                value: permission,
                                                primaryLabel: permission.replace(/([A-Z])/g, ' $1')
                                            };
                                        })}
                                        selection={values.writeRights}
                                        onChange={(newValue) => setFieldValue("writeRights", newValue)}
                                        header={"Write Rights"}
                                        style={{
                                            flexGrow: 1,
                                            overflow: "visible",
                                            height: "fit-content"
                                        }}
                                    />
                                </div>
                            )
                        }
                        <div className="flex space-x-3">
                            <Button
                                variant="solid"
                                disabled={user ? !hasChanges || !formik.isValid : !formik.isValid}
                                onClick={() => handleSubmit()}
                                id="edit-user-save"
                                loading={isSubmitting}
                                className="flex-1"
                            >
                                Save Changes
                            </Button>
                            {user && (
                                <Button
                                    variant="danger"
                                    onClick={() => setDeleteOpen(true)}
                                    id="edit-user-delete"
                                    className="flex-1"
                                >
                                    Delete User
                                </Button>
                            )}
                        </div>
                    </div>
                </Dialog.Body>
            </Dialog>
            <ConfirmDialog
                text={`Confirm delete of user <b>${user?.userName}</b>`}
                open={deleteOpen}
                onClose={handleCloseDeleteUser}
                onConfirm={handleDeleteUser}
            />
        </>
    );
};
