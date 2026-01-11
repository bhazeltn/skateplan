'use client';

import { useState, useEffect } from 'react';

enum AssetType {
  MUSIC = "music",
  VISUAL = "visual",
  TECHNICAL = "technical"
}

interface Asset {
  id: string;
  filename: string;
  stored_filename: string;
  file_type: AssetType;
  created_at: string;
}

export default function AssetsGallery({ skaterId }: { skaterId: string }) {
  const [activeTab, setActiveTab] = useState<AssetType>(AssetType.MUSIC);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchAssets = async () => {
    const token = localStorage.getItem('token');
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    
    try {
        const res = await fetch(`${api_url}/assets/${skaterId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setAssets(await res.json());
        }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchAssets();
  }, [skaterId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', activeTab);

    const token = localStorage.getItem('token');
    const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

    try {
        const res = await fetch(`${api_url}/assets/${skaterId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (res.ok) {
            fetchAssets();
        } else {
            alert("Upload failed");
        }
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const filteredAssets = assets.filter(a => a.file_type === activeTab);
  const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  
  // Helper to get direct static URL for media (now public via FastAPI mount)
  const getStaticUrl = (stored_filename: string) => {
      const baseUrl = api_url.split('/api/v1')[0];
      return `${baseUrl}/assets/${stored_filename}`;
  };

  // Keep download link pointing to API for proper filename handling
  const getDownloadUrl = (id: string) => `${api_url}/assets/download/${id}`;

  return (
    <div className="bg-white shadow sm:rounded-lg mt-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex" aria-label="Tabs">
          {[AssetType.MUSIC, AssetType.VISUAL, AssetType.TECHNICAL].map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`${
                activeTab === type
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm capitalize`}
            >
              {type}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Upload {activeTab}</label>
            <input 
                type="file" 
                onChange={handleUpload} 
                disabled={uploading}
                className="mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-50 file:text-indigo-700
                  hover:file:bg-indigo-100"
            />
            {uploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.map(asset => (
                <div key={asset.id} className="border rounded p-4">
                    <p className="text-sm font-medium text-gray-900 truncate mb-2">{asset.filename}</p>
                    {activeTab === AssetType.MUSIC && (
                        <audio controls className="w-full">
                            <source src={getStaticUrl(asset.stored_filename)} />
                            Your browser does not support the audio element.
                        </audio>
                    )}
                    {activeTab === AssetType.VISUAL && (
                        <img src={getStaticUrl(asset.stored_filename)} alt={asset.filename} className="w-full h-32 object-cover rounded" />
                    )}
                    <a href={getDownloadUrl(asset.id)} download className="text-indigo-600 hover:text-indigo-500 text-sm mt-2 block">Download</a>
                </div>
            ))}
            {filteredAssets.length === 0 && <p className="text-gray-500 text-sm">No assets found.</p>}
        </div>
      </div>
    </div>
  );
}
