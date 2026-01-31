export default function LoadingOverlay() {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg z-10">
            <div className="text-center">
                <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-gray-700 font-medium text-sm">
                    Running simulation...
                </p>
            </div>
        </div>
    );
}
