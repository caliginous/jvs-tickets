import { MainCard } from "../MainCard";
import { ShoppingCartIcon } from '@heroicons/react/solid';

export const TotalOrdersCard = ({totalOrders, totalTickets}) => {
    return (
        <MainCard
            title={`${totalOrders} / ${totalTickets}`}
            secondaryTitle={"Total Orders / Total Tickets"}
            icon={<ShoppingCartIcon /> }
            color={{
                dark: '#059669',
                main: '#10b981',
                light: '#d1fae5',
                contrastText: '#ffffff',
                200: '#a7f3d0'
            }}
        />
    )
}
