import useTranslation from "next-translate/useTranslation";
import information from "../../../locale/en/information.json";

export const BoxOfficeShippingComponent = () => {
    const { t } = useTranslation();

    return (
        <p className="text-sm text-gray-600">
            {t("information:box-office-description", null, { fallback: information["box-office-description"] })}
        </p>
    );
};
