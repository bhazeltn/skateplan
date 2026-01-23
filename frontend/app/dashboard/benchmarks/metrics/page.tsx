'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '../../../lib/supabase';
import MetricModal from '../../../components/benchmarks/MetricModal';

interface Metric {
  id: string;
  name: string;
  description: string | null;
  category: string;
  data_type: string;
  unit: string | null;
  scale_min: number | null;
  scale_max: number | null;
  is_system: boolean;
  created_at: string;
}

export default function MetricsLibraryPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [showMetricModal, setShowMetricModal] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metric | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';

      let url = `${api_url}/metrics/`;
      if (filterCategory !== 'All') {
        url += `?category=${filterCategory}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMetric = async (metricId: string, metricName: string) => {
    if (!confirm(`Are you sure you want to delete "${metricName}"? This cannot be undone if the metric is not in use.`)) {
      return;
    }

    try {
      const token = await getAuthToken();
      const api_url = process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
      const response = await fetch(`${api_url}/metrics/${metricId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchMetrics(); // Refresh list
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete metric');
      }
    } catch (error) {
      console.error('Failed to delete metric:', error);
      alert('Failed to delete metric');
    }
  };

  const handleEditMetric = (metric: Metric) => {
    setEditingMetric(metric);
    setShowMetricModal(true);
  };

  const handleModalClose = () => {
    setShowMetricModal(false);
    setEditingMetric(null);
  };

  const handleModalSuccess = () => {
    fetchMetrics();
  };

  // Filter metrics by search term
  const filteredMetrics = metrics.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (metric.description && metric.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group metrics by category
  const metricsByCategory: Record<string, Metric[]> = filteredMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, Metric[]>);

  const categories = Object.keys(metricsByCategory).sort();

  const getDataTypeDisplay = (metric: Metric) => {
    if (metric.data_type === 'numeric') {
      return `Numeric${metric.unit ? ` | ${metric.unit}` : ''}`;
    } else if (metric.data_type === 'scale') {
      return `Scale | ${metric.scale_min}-${metric.scale_max}`;
    } else {
      return 'Boolean';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="bg-card shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-foreground">Metric Library</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-border rounded-md text-foreground hover:bg-secondary"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-10">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="bg-card rounded-lg shadow">
            {/* Toolbar */}
            <div className="p-6 border-b border-border">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  Your Metrics ({metrics.length})
                </h2>
                <button
                  onClick={() => {
                    setEditingMetric(null);
                    setShowMetricModal(true);
                  }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Metric
                </button>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Search</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search metrics..."
                      className="w-full px-3 py-2 pl-10 border border-input rounded-md"
                    />
                    <svg
                      className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Filter by Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      fetchMetrics();
                    }}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    <option value="All">All Categories</option>
                    <option value="Technical">Technical</option>
                    <option value="Physical">Physical</option>
                    <option value="Mental">Mental</option>
                    <option value="Tactical">Tactical</option>
                    <option value="Environmental">Environmental</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="p-6">
              {loading ? (
                <p className="text-muted-foreground">Loading metrics...</p>
              ) : categories.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-semibold text-foreground">No metrics yet</h3>
                  <p className="mt-1 text-muted-foreground mb-4">
                    {searchTerm ? 'No metrics match your search.' : 'Get started by creating your first metric.'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={() => {
                        setEditingMetric(null);
                        setShowMetricModal(true);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                      Create Your First Metric
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {categories.map(category => (
                    <div key={category}>
                      <h3 className="text-md font-semibold text-foreground mb-3">
                        {category} ({metricsByCategory[category].length} metric{metricsByCategory[category].length !== 1 ? 's' : ''})
                      </h3>
                      <div className="space-y-2">
                        {metricsByCategory[category].map(metric => (
                          <div
                            key={metric.id}
                            className="border border-border rounded-lg p-4 hover:bg-secondary transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-semibold text-foreground">{metric.name}</h4>
                                  <span className="text-sm text-muted-foreground">
                                    {getDataTypeDisplay(metric)}
                                  </span>
                                </div>
                                {metric.description && (
                                  <p className="mt-1 text-sm text-muted-foreground">{metric.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleEditMetric(metric)}
                                  className="px-3 py-1 text-sm border border-border rounded hover:bg-secondary"
                                  title="Edit metric"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteMetric(metric.id, metric.name)}
                                  className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                                  title="Delete metric"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Metric Modal */}
      <MetricModal
        isOpen={showMetricModal}
        onClose={handleModalClose}
        metric={editingMetric}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
