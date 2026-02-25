import { IAddress } from "../../constants/interfaces";
import { ZIP } from "./ZIP";
import { useEffect, useState } from "react";
import { reducedCountryData, type Country, type Region } from "../../lib/countryData";
import { addressValidatorMap } from "../../constants/util";
import useTranslation from "next-translate/useTranslation";
import informationText from "../../../locale/en/information.json";
import { loadCountryLocale, getLocalizedCountryName } from "../../lib/countryLocalization";
import { Input, Select, type Option } from "../ui";

const validateAddressComponent = (address: IAddress, property: string) => {
    if (addressValidatorMap[property](address)) return null;
    if (property === "firstName") return "information:firstname-error";
    if (property === "lastName") return "information:lastname-error";
    if (property === "address") return "information:address-error";
    if (property === "city") return "information:city-error";
    if (property === "country") return "information:country-error";
    if (property === "region") return "information:region-error";
};

type LocalizedCountry = Country & { localizedCountryName: string | undefined };

interface AddressComponentProps {
    value: IAddress;
    onChange: (newAddress: IAddress) => unknown;
}

export const AddressComponent = ({
    value,
    onChange
}: AddressComponentProps) => {
    const { t, lang } = useTranslation();
    const [localZip, setLocalZip] = useState<string>(value.zip ?? "");
    const [firstNameError, setFirstNameError] = useState<string | null>(null);
    const [lastNameError, setLastNameError] = useState<string | null>(null);
    const [addressError, setAddressError] = useState<string | null>(null);
    const [cityError, setCityError] = useState<string | null>(null);
    const [touched, setTouched] = useState<string[]>([]);
    const [localizedCountryData, setLocalizedCountryData] = useState<LocalizedCountry[]>([]);

    useEffect(() => {
        const loadLocaleAndData = async () => {
            await loadCountryLocale(lang);
            setLocalizedCountryData(reducedCountryData.map(d => ({ 
                ...d, 
                localizedCountryName: getLocalizedCountryName(d.countryShortCode, lang) 
            })));
        };
        
        loadLocaleAndData();
    }, [lang]);

    const handleUpdate = (property: string, newValue: any) => {
        const newAddress: IAddress = { ...value };
        newAddress[property] = newValue;
        onChange(newAddress);

        const error = validateAddressComponent(newAddress, property);
        if (property === "firstName") {
            setFirstNameError(error ? t(error, null, { fallback: informationText[error.replace("information:", "")] }) : null);
        }
        if (property === "lastName") {
            setLastNameError(error ? t(error, null, { fallback: informationText[error.replace("information:", "")] }) : null);
        }
        if (property === "address") {
            setAddressError(error ? t(error, null, { fallback: informationText[error.replace("information:", "")] }) : null);
        }
        if (property === "city") {
            setCityError(error ? t(error, null, { fallback: informationText[error.replace("information:", "")] }) : null);
        }
    };

    const handleChangeZip = (newValue: string, valid: boolean) => {
        setLocalZip(newValue);
        if (!valid) return;
        handleUpdate("zip", newValue);
    };

    const handleChangeCountry = (option: Option<string> | null) => {
        if (!option) return;
        const country = localizedCountryData.find(c => c.countryName === option.value);
        if (!country) return;

        const newAddress: IAddress = { ...value };
        newAddress.country = country;
        newAddress.region = null;
        onChange(newAddress);
    };

    const handleTouched = (name: string) => {
        if (touched.includes(name)) return;
        const newPush = [...touched, name];
        setTouched(newPush);
    };

    const handleChangeRegion = (option: Option<string> | null) => {
        if (!value.country || !option) return;
        const region = value.country.regions.find(r => r.name === option.value);
        if (region) {
            handleUpdate("region", region);
        }
    };

    const countryOptions = localizedCountryData
        .sort((a, b) => (a.localizedCountryName ?? a.countryName) > (b.localizedCountryName ?? b.countryName) ? 1 : -1)
        .map(country => ({
            value: country.countryName,
            label: country.localizedCountryName ?? country.countryName
        }));

    const regionOptions = value.country?.regions.map(region => ({
        value: region.name,
        label: region.name
    })) || [];

    return (
        <div className="space-y-4">
            <Input
                label={t("information:firstname", null, { fallback: informationText.firstname })}
                value={value.firstName ?? ""}
                onChange={(event) =>
                    handleUpdate("firstName", event.target.value)
                }
                error={touched.includes("firstname") && firstNameError ? firstNameError : undefined}
                name="address-firstname"
                onBlur={() => handleTouched("firstname")}
            />
            
            <Input
                label={t("information:lastname", null, { fallback: informationText.lastname })}
                value={value.lastName ?? ""}
                onChange={(event) =>
                    handleUpdate("lastName", event.target.value)
                }
                error={touched.includes("lastname") && lastNameError ? lastNameError : undefined}
                name="address-lastname"
                onBlur={() => handleTouched("lastname")}
            />
            
            <Input
                label={t("information:address", null, { fallback: informationText.address })}
                value={value.address ?? ""}
                onChange={(event) =>
                    handleUpdate("address", event.target.value)
                }
                error={touched.includes("address") && addressError ? addressError : undefined}
                name="address-address"
                onBlur={() => handleTouched("address")}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                    <ZIP
                        value={localZip}
                        onChange={handleChangeZip}
                        name="address-zip"
                    />
                </div>
                <div className="md:col-span-8">
                    <Input
                        label={t("information:city", null, { fallback: informationText.city })}
                        value={value.city ?? ""}
                        onChange={(event) =>
                            handleUpdate("city", event.target.value)
                        }
                        error={touched.includes("city") && cityError ? cityError : undefined}
                        name="address-city"
                        onBlur={() => handleTouched("city")}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                    label={t("information:country", null, { fallback: informationText.country })}
                    value={value.country?.countryName ?? ""}
                    onChange={(val) => {
                        if (val) {
                            handleChangeCountry({ value: val, label: val });
                        }
                    }}
                    options={countryOptions}
                    placeholder="Select country"
                />
                
                {value.country && value.country.regions.length > 0 && (
                    <Select
                        label={t("information:region", null, { fallback: informationText.region })}
                        value={value.region?.name ?? ""}
                        onChange={(val) => {
                            if (val) {
                                handleChangeRegion({ value: val, label: val });
                            }
                        }}
                        options={regionOptions}
                        placeholder="Select region"
                    />
                )}
            </div>
        </div>
    );
};
