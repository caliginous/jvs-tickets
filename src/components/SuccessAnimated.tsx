import { motion } from "framer-motion";
import { CSSProperties } from "react";

interface SuccessAnimatedProps {
    style?: CSSProperties;
}

export const SuccessAnimated = ({ style }: SuccessAnimatedProps) => {
    const successColor = "#10b981"; // green-500 equivalent

    return (
        <svg
            className="progress-icon"
            viewBox="0 0 50 50"
            style={{ ...style, maxWidth: 300, maxHeight: 300 }}
        >
            <motion.path
                fill="none"
                strokeWidth="2"
                stroke={successColor}
                d="M 0, 20 a 20, 20 0 1,0 40,0 a 20, 20 0 1,0 -40,0"
                style={{ translateX: 5, translateY: 5 }}
                animate={{
                    pathLength: 1,
                    transition: {
                        delay: 0.1,
                        duration: 0.3
                    }
                }}
                initial={{
                    pathLength: 0
                }}
            />
            <motion.path
                fill="none"
                strokeWidth="2"
                stroke={successColor}
                d="M14,26 L 22,33 L 35,16"
                strokeDasharray="0 1"
                animate={{
                    pathLength: 1,
                    transition: {
                        delay: 0.4,
                        duration: 0.3
                    }
                }}
                initial={{
                    pathLength: 0
                }}
            />
        </svg>
    );
};