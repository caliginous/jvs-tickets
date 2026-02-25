import { Dialog, Button, Input } from "../../../ui";
import { useEffect, useState } from "react";
import axios from "axios";
import { showToast } from "../../../ui";
import { signOut } from "next-auth/react";

export const ChangePasswordDialog = ({ open, user, onClose }) => {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    useEffect(() => {
        if (!open) return;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
    }, [open]);

    const canChange =
        confirmNewPassword === newPassword &&
        confirmNewPassword.length > 6 &&
        currentPassword.length > 6;

    const changePassword = async () => {
        if (!canChange) return;
        try {
            await axios.put("/api/admin/user/" + user.id, {
                username: user.username,
                email: user.email,
                password: newPassword,
                oldPassword: currentPassword
            });
            signOut().catch(alert);
            onClose();
        } catch (e) {
            showToast.error("Error: " + (e.response?.data ?? e.message));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} size="md">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">Change Password</h3>
            </Dialog.Header>
            <Dialog.Body>
                <div className="space-y-4 py-2">
                    <Input
                        value={currentPassword}
                        onChange={(event) =>
                            setCurrentPassword(event.target.value)
                        }
                        label="Current Password"
                        type="password"
                        id="change-password-current"
                    />
                    <Input
                        value={newPassword}
                        onChange={(event) =>
                            setNewPassword(event.target.value)
                        }
                        label="New Password"
                        type="password"
                        id="change-password-new"
                    />
                    <Input
                        value={confirmNewPassword}
                        onChange={(event) =>
                            setConfirmNewPassword(event.target.value)
                        }
                        label="Confirm New Password"
                        type="password"
                        id="change-password-new-confirm"
                    />
                    <Button
                        onClick={changePassword}
                        disabled={!canChange}
                        id="change-password-button"
                        className="w-full"
                    >
                        Change Password
                    </Button>
                    {!canChange && (
                        <p className="text-sm text-red-600">
                            Passwords need to match and have to be minimum
                            of 7 characters long!
                        </p>
                    )}
                </div>
            </Dialog.Body>
        </Dialog>
    );
};
