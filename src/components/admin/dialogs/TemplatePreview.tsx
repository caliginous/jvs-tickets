import { Dialog } from "../../../ui";
import { useEffect, useState } from "react";
import axios from "axios";
import { XIcon } from "@heroicons/react/solid";
import { OptionLabels } from "../../../constants/Constants";

function getLang() {
    if (navigator.languages != undefined)
        return navigator.languages[0];
    return navigator.language;
}

export const TemplatePreview = ({activeTemplatePreview, localFiles, onClose}) => {
    const [data, setData] = useState(null);
    const [type, setType] = useState(null);
    const [withDemoData, setWithDemoData] = useState(false);

    useEffect(() => {
        if (activeTemplatePreview === null) return;

        const loadData = async () => {
            if (Object.keys(localFiles).includes(activeTemplatePreview)) {
                setWithDemoData(false);
                setData(URL.createObjectURL(localFiles[activeTemplatePreview]));
                return;
            }

            const response = await axios.get("/api/admin/options/data/" + activeTemplatePreview + "?demo=true&locale=" + getLang(), {
                responseType: "blob"
            });
            setWithDemoData(true);
            setType(response.headers["content-type"]);
            setData(URL.createObjectURL(response.data));
        };

        loadData().catch(console.log);
    }, [localFiles, activeTemplatePreview]);

    return (
        <Dialog open={activeTemplatePreview !== null} onClose={onClose} size="full">
            <Dialog.Header>
                <h3 className="text-lg font-semibold">
                    Template preview ({activeTemplatePreview && OptionLabels[activeTemplatePreview]})
                </h3>
            </Dialog.Header>
            <Dialog.Body>
            {activeTemplatePreview !== null && data !== null && (
                <>
                    <p className="text-center my-4 text-gray-700">
                        {withDemoData ? (
                            "Template filled with test data:"
                        ) : (
                            "Template not filled with test data. No preview with test data, please save template before viewing preview."
                        )}
                    </p>
                    <object type={type} data={data} className="w-full h-full" />
                </>
            )}
            {activeTemplatePreview !== null && data === null && (
                <div className="w-full h-full flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}
                </Dialog.Body>
            </Dialog>
    )
}
