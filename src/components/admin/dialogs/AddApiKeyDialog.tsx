import { Dialog, Button, Input } from "../../../ui";
import { useState } from "react";
import axios from "axios";
import { ClipboardCopyIcon } from "@heroicons/react/solid";
import { showToast } from "../../../ui";

export const AddApiKeyDialog = ({ open, onClose, onKeyGenerated }) => {
    const [name, setName] = useState("");
    const [token, setToken] = useState(null);

    const copyToClipboard = async () => {
        await navigator.clipboard.writeText(token);
        showToast.success("Copied to clipboard!");
    };

    const handleClose = () => {
        if (token !== null) onKeyGenerated();
        setToken(null);
        setName("");
        onClose();
    };

    const generateApiKey = async () => {
        try {
            const response = await axios.post("/api/admin/user/apiKey", {
                name: name
            });
            setToken(response.data.token);
        } catch (e) {
            showToast.error("Error: " + (e.response?.data ?? e.message));
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} size="md">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">Create API Key</h3>
            </Dialog.Header>
            <Dialog.Body>
                <div className="space-y-4 py-2">
                    {token === null ? (
                        <>
                            <Input
                                value={name}
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                label="Name"
                                id="api-key-name"
                            />
                            <Button onClick={generateApiKey} id="api-key-generate" className="w-full">
                                Generate
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600">
                                After clicking Close, the API Key will
                                disappear and is not recoverable. So keep
                                him save.
                            </p>
                            <div className="flex items-center bg-gray-100 rounded-lg p-3">
                                <code className="flex-1 text-center text-sm font-mono text-gray-800" id="api-key-token">
                                    {token}
                                </code>
                                <button
                                    onClick={copyToClipboard}
                                    id="api-key-copy-to-clipboard"
                                    className="ml-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
                                    title="Copy to clipboard"
                                >
                                    <ClipboardCopyIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <Button
                                onClick={handleClose}
                                id="api-key-close-button"
                                className="w-full"
                            >
                                Close
                            </Button>
                        </>
                    )}
                </div>
            </Dialog.Body>
        </Dialog>
    );
};
