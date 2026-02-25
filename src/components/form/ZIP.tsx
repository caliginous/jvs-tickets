import { ChangeEvent, useState } from "react";
import useTranslation from "next-translate/useTranslation";
import informationText from "../../../locale/en/information.json";
import { Input } from "../ui";

interface ZIPProps {
    value: string;
    onChange: (newValue: string, valid: boolean) => unknown;
    name?: string;
}

export const ZIP = ({
    value,
    onChange,
    name
}: ZIPProps) => {
    const [error, setError] = useState<string | undefined>(undefined);
    const { t } = useTranslation();
    const [touched, setTouched] = useState<boolean>(false);

    // Validates UK postcodes (accepts with/without space, case-insensitive)
    const isValidUKPostcode = (raw: string): boolean => {
        if (!raw) return false;
        const input = raw.toUpperCase().trim();
        const re = /^(GIR 0AA|(?:[A-PR-UWYZ][0-9]{1,2}|(?:[A-PR-UWYZ][A-HK-Y][0-9]{1,2})|(?:[A-PR-UWYZ][0-9][A-HJKPSTUW])|(?:[A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRVWXY])) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;
        return re.test(input);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const isValid = isValidUKPostcode(event.target.value);
        onChange(event.target.value, isValid);
        if (isValid) {
            setError(undefined);
            return;
        }
        setError(t("information:zip-error", null, {fallback: informationText["zip-error"]}));
    };

    return (
        <Input
            label={t("information:zip", null, {fallback: informationText.zip})}
            error={touched && error ? error : undefined}
            helper={touched && error ? error : undefined}
            onChange={handleChange}
            value={value}
            name={name}
            onBlur={() => setTouched(true)}
            className="w-full"
        />
    );
};
