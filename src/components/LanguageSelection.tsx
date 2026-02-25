import { useRouter } from "next/router";
import { FlagIcon, FlagIconCode } from "react-flag-kit";
import { Select, type Option } from "./ui";

export const LanguageSelection = () => {
    const router = useRouter();

    const handleSwitchLocale = async (option: Option<string> | null) => {
        if (option) {
            await router.replace(router.asPath, router.asPath, { locale: option.value });
        }
    };

    // we don't need a language dropdown with only one language
    if ((router.locales?.length ?? 0) <= 1) return null;

    const languageOptions = router.locales?.map((locale) => {
        let code = locale.toUpperCase().split("-")[0];
        code = code !== "EN" ? code : "GB";
        return {
            value: locale,
            label: (
                <div className="flex items-center justify-between">
                    <FlagIcon
                        code={code as FlagIconCode}
                        className="mr-2"
                    />
                    <span>{code}</span>
                </div>
            )
        };
    }) || [];

    return (
        <Select
            value={router.locale ?? ""}
            onChange={handleSwitchLocale}
            options={languageOptions}
            placeholder="Select language"
            className="flex-1"
        />
    );
};
