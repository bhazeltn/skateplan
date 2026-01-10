export default function SkaterProfilePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">Skater Profile</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900 mb-6">Skater ID: {params.id}</h1>
          
          <div className="bg-white shadow sm:rounded-lg mb-8">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Benchmarks & Goals</h3>
            </div>
            <div className="px-4 py-5 sm:p-6">
               <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="p-4 border rounded-md">
                      <h4 className="font-bold text-gray-800">Pre-Novice Standards</h4>
                      <ul className="mt-2 space-y-2 text-sm text-gray-600">
                          <li className="flex justify-between">
                              <span>Vertical Jump</span>
                              <span className="font-medium text-gray-900">Target: 14"</span>
                          </li>
                          <li className="flex justify-between">
                              <span>Double Axel</span>
                              <span className="font-medium text-gray-900">Target: Consist.</span>
                          </li>
                      </ul>
                  </div>
                  {/* Placeholder for "Add New Benchmark" */}
                  <div className="flex items-center justify-center p-4 border-2 border-dashed rounded-md text-gray-400 cursor-pointer hover:border-blue-500 hover:text-blue-500">
                      + Create New Benchmark Profile
                  </div>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
