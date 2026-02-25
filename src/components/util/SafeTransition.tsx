import { Fragment } from "react";
import { Transition } from "@headlessui/react";

type Props = React.ComponentProps<typeof Transition>;

export default function SafeTransition({ show, as = Fragment, ...rest }: Omit<Props, 'show'> & { show?: any }) {
    return <Transition show={Boolean(show)} as={as} {...rest} />;
}
