import useTranslation from "next-translate/useTranslation";
import information from "../../../locale/en/information.json";

export const DownloadShippingComponent = () => {
    const { t } = useTranslation();
    return (
        <p className="text-sm text-gray-600">
            {t("information:download-description", null, { fallback: information["download-description"] })}
        </p>
    );
};
