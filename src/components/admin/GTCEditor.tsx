import React, { useEffect, useState } from "react";
import { Dialog, Button } from "../ui";
import 'react-draft-wysiwyg/dist/react-draft-wysiwyg.css';
import axios from "axios";
import dynamic from "next/dynamic";
import { XIcon, DocumentTextIcon, ShieldCheckIcon } from "@heroicons/react/solid";
import { convertToHTML, convertFromHTML } from 'draft-convert';
import { EditorState } from "draft-js";
import { Options } from "../../constants/Constants";

const Editor = dynamic<any>(() =>
    import("react-draft-wysiwyg").then((mod) => mod.Editor),
    { ssr: false }
);

export const GTCEditor = () => {
    const [open, setOpen] = useState<string | null>(null);
    const [data, setData] = useState(EditorState.createEmpty());

    useEffect(() => {
        if (!open) return;
        const loadData = async () => {
            const response = await axios.get("/api/gtc?type=" + open, {
                responseType: "blob"
            });
            const text = await response.data.text();
            setData(EditorState.push(EditorState.createEmpty(), convertFromHTML(text)));
        };
        loadData().catch(console.log);
    }, [open]);

    const handleSave = async () => {
        await axios.post("/api/admin/options/data/" + (open === "privacy" ? Options.Privacy : Options.GTC), {
            data: convertToHTML(data?.getCurrentContent()),
            type: "text/html"
        });
        setOpen(null);
    };

    return (
        <>
            <Dialog open={open !== null} onClose={() => setOpen(null)} className="max-w-7xl">
                <div className="flex items-start justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="w-6 h-6" />
                        <h2 className="text-xl font-semibold">
                            Edit Terms and Conditions
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                        onClick={() => setOpen(null)}
                    >
                        <span className="sr-only">Close</span>
                        <XIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
                <div className="px-6 py-4">
                    <div className="h-[calc(100vh-200px)] p-4">
                        <Editor
                            editorState={data}
                            onEditorStateChange={setData}
                            toolbarCustomButtons={[
                                <Button onClick={handleSave} key="save-button">
                                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                                    Save
                                </Button>
                            ]}
                            wrapperStyle={{
                                height: "100%",
                                display: "flex",
                                flexDirection: "column"
                            }}
                            editorStyle={{
                                flex: "1 1 auto",
                                border: "1px solid #F1F1F1"
                            }}
                        />
                    </div>
                </div>
            </Dialog>
            
            <div className="space-y-3">
                <Button 
                    onClick={() => setOpen("gtc")} 
                    className="w-full"
                >
                    <DocumentTextIcon className="w-4 h-4 mr-2" />
                    Open GTC
                </Button>
                <Button 
                    onClick={() => setOpen("privacy")} 
                    className="w-full"
                >
                    <ShieldCheckIcon className="w-4 h-4 mr-2" />
                    Open Privacy Policy
                </Button>
            </div>
        </>
    );
};
