export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">SkatePlan</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Dashboard</h1>
          <div className="mt-6">
            <div className="h-96 p-4 border-4 border-gray-200 border-dashed rounded-lg">
              <p className="text-center text-gray-500 pt-32">Welcome to the SkatePlan Dashboard.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
