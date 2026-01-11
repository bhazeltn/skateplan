export default function LibraryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">SkatePlan Library</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between mb-6">
            <h1 className="text-3xl font-bold leading-tight text-gray-900">Element Library</h1>
            <button className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Refresh Data
            </button>
          </div>
          
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  placeholder="Search elements..." 
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Code</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Name</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Category</th>
                  <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Base Value</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Placeholder rows until we hook up API */}
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">1A</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">Axel</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">Singles</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">1.10</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">3Lz</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">Triple Lutz</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">Singles</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">5.90</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
