interface FullSizeLoadingProps {
    isLoading: boolean;
}

export const FullSizeLoading = ({ isLoading }: FullSizeLoadingProps) => {
    if (!isLoading) return null;

    return (
        <div className="absolute inset-0 w-full h-full flex justify-center items-center bg-black bg-opacity-30 z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
};
