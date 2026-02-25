import { useEffect, useState } from "react";
import { AddressComponentLazy } from "../form/AddressComponentLazy";
import { IAddress } from "../../constants/interfaces";
import { PostalDeliveryShipping } from "../../store/factories/shipping/PostalDeliveryShipping";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
    selectPersonalInformation,
    setShipping
} from "../../store/reducers/personalInformationReducer";
import useTranslation from "next-translate/useTranslation";
import information from "../../../locale/en/information.json";

export const PostalDeliveryShippingComponent = () => {
    const { t } = useTranslation();
    const selector = useAppSelector(selectPersonalInformation);
    const dispatch = useAppDispatch();

    const postalDelivery = new PostalDeliveryShipping(selector.shipping);

    const [useDifferentAddress, setUseDifferentAddress] = useState<boolean>(
        postalDelivery.postalData.differentAddress
    );
    const [address, setAddress] = useState<IAddress>(
        postalDelivery.postalData.address
    );

    useEffect(() => {
        const postalDelivery = new PostalDeliveryShipping(null);
        postalDelivery.data = {
            differentAddress: useDifferentAddress,
            address: address
        };
        dispatch(setShipping(postalDelivery.Shipping));
    }, [useDifferentAddress, address, dispatch]);

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600">
                {t("information:postal-delivery-description", null, { fallback: information["postal-delivery-description"] })}
            </p>
            
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    id="postal-delivery-extra-address"
                    checked={useDifferentAddress}
                    onChange={(event) =>
                        setUseDifferentAddress(event.target.checked)
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label 
                    htmlFor="postal-delivery-extra-address"
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                >
                    {t("information:differing-shipping-address", null, { fallback: information["differing-shipping-address"] })}
                </label>
            </div>

            {useDifferentAddress && (
                <AddressComponentLazy value={address} onChange={setAddress} />
            )}
        </div>
    );
};
