export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#178b9c] mx-auto"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
