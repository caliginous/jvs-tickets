import { Card, CardContent } from "../../../ui";

export const MainCard = ({title, secondaryTitle, titleIcon, icon, color, navigations, children}: {
    title?: JSX.Element | string, 
    secondaryTitle?: JSX.Element | string, 
    titleIcon?: JSX.Element, 
    icon?: JSX.Element, 
    color?: any, 
    navigations?: Array<JSX.Element>, 
    children?: JSX.Element
}) => {
    // Default color if none provided
    const defaultColor = {
        dark: '#1f2937',
        main: '#3b82f6',
        light: '#dbeafe',
        contrastText: '#ffffff',
        200: '#bfdbfe'
    };
    
    const cardColor = color || defaultColor;

    return (
        <Card className="h-full overflow-hidden relative" style={{ backgroundColor: cardColor.dark, color: cardColor.contrastText }}>
            {/* Decorative circles */}
            <div 
                className="absolute w-52 h-52 rounded-full opacity-50"
                style={{ 
                    background: cardColor.light,
                    top: '-85px',
                    right: '-95px'
                }}
            />
            <div 
                className="absolute w-52 h-52 rounded-full opacity-50"
                style={{ 
                    background: cardColor.main,
                    top: '-125px',
                    right: '-15px'
                }}
            />
            
            <CardContent className="p-4 flex flex-col justify-center h-full relative z-10">
                <div className="flex flex-col h-full">
                    {/* Header with icon and navigations */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-black/25 rounded-lg flex items-center justify-center mt-1">
                            {icon}
                        </div>
                        <div className="flex space-x-2 z-10">
                            {navigations?.map((navigation, index) => (
                                <div key={index}>
                                    {navigation}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Title section */}
                    <div className="flex items-center mb-3">
                        <div className="flex-1">
                            <h2 
                                className="text-4xl font-medium mr-4 mt-7 mb-3"
                                style={{ color: cardColor.contrastText }}
                            >
                                {title}
                            </h2>
                        </div>
                        {titleIcon && (
                            <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
                                style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                    color: cardColor.dark
                                }}
                            >
                                {titleIcon}
                            </div>
                        )}
                    </div>

                    {/* Secondary title */}
                    <div className="mb-5">
                        <p 
                            className="text-base font-medium"
                            style={{ color: cardColor[200] }}
                        >
                            {secondaryTitle}
                        </p>
                    </div>

                    {/* Children content */}
                    {children && (
                        <div className="mt-auto">
                            {children}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
