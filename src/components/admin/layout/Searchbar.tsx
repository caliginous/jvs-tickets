import { useState } from "react";
import { SearchIcon } from "@heroicons/react/solid";
import { Button, Input } from "../../../ui";

const APPBAR_MOBILE = 64;
const APPBAR_DESKTOP = 92;

export const Searchbar = () => {
    const [isOpen, setOpen] = useState(false);

    const handleOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleSearch = () => {
        // TODO
        handleClose();
    };

    return (
        <div className="relative">
            {!isOpen && (
                <button
                    onClick={handleOpen}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                >
                                            <SearchIcon className="w-5 h-5" />
                </button>
            )}

            {isOpen && (
                <div className="absolute top-0 left-0 z-50 w-full flex items-center h-16 md:h-20 bg-white/70 backdrop-blur-md shadow-lg px-3 md:px-5">
                    <Input
                        autoFocus
                        placeholder="Search…"
                        startAdornment={<SearchIcon className="w-5 h-5 text-gray-400" />}
                        className="mr-2 font-medium"
                    />
                    <Button variant="solid" onClick={handleSearch}>
                        Search
                    </Button>
                    <button
                        onClick={handleClose}
                        className="ml-2 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
};
