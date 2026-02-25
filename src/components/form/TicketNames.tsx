import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { selectOrder, setTicketFirstName, setTicketLastName, Ticket } from "../../store/reducers/orderReducer";
import { BookOpenIcon } from "@heroicons/react/solid";
import useTranslation from "next-translate/useTranslation";
import { Input } from "../ui";

interface TicketNamesProps {
    categories: any[];
}

export const TicketNames = ({ categories }: TicketNamesProps) => {
    const order = useAppSelector(selectOrder);

    return (
        <div className="space-y-4">
            {order.tickets.map((ticket: Ticket, index) => (
                <TicketNameItem key={index} index={index} categories={categories} />
            ))}
        </div>
    );
};

interface TicketNameItemProps {
    index: number;
    categories: any[];
}

const TicketNameItem = ({ index, categories }: TicketNameItemProps) => {
    const { t } = useTranslation();
    const order = useAppSelector(selectOrder);
    const dispatch = useAppDispatch();
    const ticket = order.tickets[index];

    const handleChangeName = (setter: any, key: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setter({ index, [key]: event.target.value }));
    };

    const resolveCategory = (id: number) => {
        return categories.find(category => category.id === id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <BookOpenIcon className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                    <div>
                        <div className="text-sm font-medium text-gray-900">
                            {(index + 1) + ". " + resolveCategory(ticket.categoryId)?.label}
                        </div>
                        {ticket.seatId && (
                            <div className="text-sm text-gray-500">
                                {t("information:seat", { seat: ticket.seatId })}
                            </div>
                        )}
                    </div>
                    
                    <Input
                        placeholder={t("information:firstname")}
                        onChange={handleChangeName(setTicketFirstName, "firstName")}
                        className="ticket-names-firstname w-full"
                    />
                    
                    <Input
                        placeholder={t("information:lastname")}
                        onChange={handleChangeName(setTicketLastName, "lastName")}
                        className="ticket-names-lastname w-full"
                    />
                </div>
            </div>
            
            {index < order.tickets.length - 1 && (
                <div className="border-t border-gray-200" />
            )}
        </div>
    );
};
