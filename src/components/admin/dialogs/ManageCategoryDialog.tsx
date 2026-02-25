import { Dialog, Button, Input } from "../../../ui";
import * as Yup from "yup";
import { Form, FormikProvider, useFormik } from "formik";
import axios from "axios";
import { XIcon } from "@heroicons/react/solid";
import currencyToSymbolMap from "currency-symbol-map/map";
import { SEAT_COLORS } from "../../../constants/Constants";
import { HexColorPicker } from "react-colorful";
import { showToast } from "../../../ui";
import { ConfirmDialog } from "./ConfirmDialog";
import { useEffect, useState } from "react";

interface props {
    open: boolean;
    onClose: () => unknown;
    onChange?: Function;
    category?: any;
    currency: string;
}

export const ManageCategoryDialog = ({ open, onClose, onChange, category, currency }: props) => {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null);

    const schema = Yup.object().shape({
        label: Yup.string().required("Name is required"),
        price: Yup.number().required("Price is required"),
        color: Yup.string(),
        activeColor: Yup.string(),
        occupiedColor: Yup.string()
    });

    const formik = useFormik({
        initialValues: {
            label: category?.label || "",
            price: category?.price || 0,
            color: category?.color || "#59bb59",
            activeColor: category?.activeColor || "#3b82f6",
            occupiedColor: category?.occupiedColor || "#ef4444",
        },
        validationSchema: schema,
        enableReinitialize: true,
        validateOnChange: true,
        validateOnBlur: true,
        onSubmit: async (values) => {
            try {
                if (category === null) {
                    const response = await fetch("/api/admin/category", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(values),
                    });

                    if (!response.ok) {
                        throw new Error("Failed to create category");
                    }
                } else {
                    const response = await fetch(`/api/admin/category/${category.id}`, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(values),
                    });

                    if (!response.ok) {
                        throw new Error("Failed to update category");
                    }
                }

                onChange();
                onClose();
            } catch (error) {
                console.error("Error saving category:", error);
            }
        },
    });

    const handleDeleteCategory = async () => {
        try {
            const response = await fetch(`/api/admin/category/${category?.id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete category");
            }

            onChange();
            onClose();
            setDeleteOpen(false);
        } catch (error) {
            console.error("Error deleting category:", error);
        }
    };

    const {
        values,
        errors,
        touched,
        handleSubmit,
        isSubmitting,
        setFieldValue,
        getFieldProps,
    } = formik;

    return (
        <>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
                    <div className="relative bg-white rounded-lg p-6 w-full max-w-md mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">
                                {category === null ? "Create new Ticket Type" : "Edit Ticket Type"}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <FormikProvider value={formik}>
                            <Form
                                autoComplete="off"
                                noValidate
                                onSubmit={handleSubmit}
                            >
                                <div className="space-y-4 py-2">
                                    <Input
                                        label="Name"
                                        {...getFieldProps("label")}
                                        error={touched.label && errors.label ? String(errors.label) : undefined}
                                    />
                                    <div className="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2">
                                        <Input
                                            label="Price"
                                            {...getFieldProps("price")}
                                            error={touched.price && errors.price ? String(errors.price) : undefined}
                                            endAdornment={currencyToSymbolMap[currency]}
                                            className="flex-1"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">
                                            Color:
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
                                                style={{ backgroundColor: values.color }}
                                                onClick={() => setColorPickerOpen('color')}
                                            />
                                            <input
                                                type="text"
                                                value={values.color}
                                                onChange={(e) => setFieldValue('color', e.target.value)}
                                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>
                                    {colorPickerOpen === 'color' && (
                                        <div className="absolute z-50 mt-2">
                                            <div className="fixed inset-0" onClick={() => setColorPickerOpen(null)} />
                                            <HexColorPicker
                                                color={values.color}
                                                onChange={(color) => setFieldValue('color', color)}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">
                                            Active Color:
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
                                                style={{ backgroundColor: values.activeColor }}
                                                onClick={() => setColorPickerOpen('activeColor')}
                                            />
                                            <input
                                                type="text"
                                                value={values.activeColor}
                                                onChange={(e) => setFieldValue('activeColor', e.target.value)}
                                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>
                                    {colorPickerOpen === 'activeColor' && (
                                        <div className="absolute z-50 mt-2">
                                            <div className="fixed inset-0" onClick={() => setColorPickerOpen(null)} />
                                            <HexColorPicker
                                                color={values.activeColor}
                                                onChange={(color) => setFieldValue('activeColor', color)}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">
                                            Occupied Color:
                                        </span>
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
                                                style={{ backgroundColor: values.occupiedColor }}
                                                onClick={() => setColorPickerOpen('occupiedColor')}
                                            />
                                            <input
                                                type="text"
                                                value={values.occupiedColor}
                                                onChange={(e) => setFieldValue('occupiedColor', e.target.value)}
                                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                            />
                                        </div>
                                    </div>
                                    {colorPickerOpen === 'occupiedColor' && (
                                        <div className="absolute z-50 mt-2">
                                            <div className="fixed inset-0" onClick={() => setColorPickerOpen(null)} />
                                            <HexColorPicker
                                                color={values.occupiedColor}
                                                onChange={(color) => setFieldValue('occupiedColor', color)}
                                            />
                                        </div>
                                    )}
                                    <div className="flex space-x-3">
                                        <Button
                                            variant="solid"
                                            size="lg"
                                            type="submit"
                                            loading={isSubmitting}
                                            disabled={!formik.isValid || isSubmitting || !values.label || !values.price}
                                            className="flex-1"
                                        >
                                            {category === null ? "Add Ticket Type" : "Save"}
                                        </Button>
                                        {category && (
                                                                                    <Button
                                            variant="danger"
                                            onClick={() => setDeleteOpen(true)}
                                            className="flex-1"
                                        >
                                            Delete Ticket Type
                                        </Button>
                                        )}
                                    </div>
                                </div>
                            </Form>
                        </FormikProvider>
                    </div>
                </div>
            )}
            
            <ConfirmDialog
                text={`Confirm delete of Ticket Type <b>${category?.label}</b>`}
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={handleDeleteCategory}
            />
        </>
    );
};
