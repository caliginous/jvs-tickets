import SimpleBarReact from "simplebar-react";
import { useEffect, useState } from "react";

interface ScrollbarProps {
    children: React.ReactNode;
    className?: string;
    [key: string]: any;
}

export const Scrollbar = ({ children, className, ...other }: ScrollbarProps) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (!navigator.userAgent) return;
        setIsMobile(
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent
            )
        );
    }, []);

    if (isMobile) {
        return (
            <div className={`overflow-x-auto ${className || ""}`} {...other}>
                {children}
            </div>
        );
    }

    return (
        <div className="flex-grow h-full overflow-hidden">
            <SimpleBarReact
                timeout={500}
                clickOnTrack={false}
                className={`max-h-full scrollbar-custom ${className || ""}`}
                {...other}
            >
                {children}
            </SimpleBarReact>
            <style jsx global>{`
                .scrollbar-custom .simplebar-scrollbar:before {
                    background-color: rgba(107, 114, 128, 0.48);
                }
                .scrollbar-custom .simplebar-scrollbar.simplebar-visible:before {
                    opacity: 1;
                }
                .scrollbar-custom .simplebar-track.simplebar-vertical {
                    width: 10px;
                }
                .scrollbar-custom .simplebar-track.simplebar-horizontal .simplebar-scrollbar {
                    height: 6px;
                }
                .scrollbar-custom .simplebar-mask {
                    z-index: inherit;
                }
            `}</style>
        </div>
    );
};
