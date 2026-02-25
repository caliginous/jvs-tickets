import * as React from "react";

interface StripeInputProps {
    component: any;
    options?: any;
    [key: string]: any;
}

export const StripeInput = React.forwardRef<any, StripeInputProps>(
    function StripeInput(props, ref) {
        const { component: Component, options, ...other } = props;
        const [mountNode, setMountNode] = React.useState<any | null>(null);

        React.useImperativeHandle(
            ref,
            () => ({
                focus: () => mountNode.focus()
            }),
            [mountNode]
        );

        return (
            <Component
                onReady={setMountNode}
                options={{
                    ...options,
                    style: {
                        base: {
                            color: "#1f2937", // text-gray-800
                            fontSize: "16px",
                            lineHeight: "1.4375em", // 23px
                            "::placeholder": {
                                color: "rgba(31, 41, 55, 0.42)" // text-gray-800 with 42% opacity
                            }
                        },
                        invalid: {
                            color: "#1f2937" // text-gray-800
                        }
                    }
                }}
                {...other}
            />
        );
    }
);
