/**
 * Learning System Product Mapping (Admin)
 * Manage WooCommerce product mappings for Learning System EN/AR packages
 * Maps WooCommerce products to languages and access permissions
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  XCircle,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LearningSystemProduct {
  id: string;
  woocommerce_product_id: number;
  language: 'EN' | 'AR';
  includes_question_bank: boolean;
  includes_flashcards: boolean;
  validity_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  woocommerce_product_id: string;
  language: 'EN' | 'AR';
  includes_question_bank: boolean;
  includes_flashcards: boolean;
  validity_months: string;
  is_active: boolean;
}

export function LearningSystemProductMapping() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    woocommerce_product_id: '',
    language: 'EN',
    includes_question_bank: true,
    includes_flashcards: true,
    validity_months: '12',
    is_active: true,
  });

  // Fetch all product mappings
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['learning-system-products'],
    queryFn: async () => {
      const { supabase } = await import('@/shared/config/supabase.config');
      const { data, error } = await supabase
        .from('learning_system_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LearningSystemProduct[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { supabase } = await import('@/shared/config/supabase.config');
      const { error } = await supabase.from('learning_system_products').insert({
        woocommerce_product_id: parseInt(data.woocommerce_product_id),
        language: data.language,
        includes_question_bank: data.includes_question_bank,
        includes_flashcards: data.includes_flashcards,
        validity_months: parseInt(data.validity_months),
        is_active: data.is_active,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-system-products'] });
      resetForm();
      setShowAddForm(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const { supabase } = await import('@/shared/config/supabase.config');
      const { error } = await supabase
        .from('learning_system_products')
        .update({
          woocommerce_product_id: parseInt(data.woocommerce_product_id),
          language: data.language,
          includes_question_bank: data.includes_question_bank,
          includes_flashcards: data.includes_flashcards,
          validity_months: parseInt(data.validity_months),
          is_active: data.is_active,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-system-products'] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { supabase } = await import('@/shared/config/supabase.config');
      const { error } = await supabase
        .from('learning_system_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-system-products'] });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { supabase } = await import('@/shared/config/supabase.config');
      const { error } = await supabase
        .from('learning_system_products')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-system-products'] });
    },
  });

  const resetForm = () => {
    setFormData({
      woocommerce_product_id: '',
      language: 'EN',
      includes_question_bank: true,
      includes_flashcards: true,
      validity_months: '12',
      is_active: true,
    });
  };

  const handleEdit = (product: LearningSystemProduct) => {
    setEditingId(product.id);
    setFormData({
      woocommerce_product_id: product.woocommerce_product_id.toString(),
      language: product.language,
      includes_question_bank: product.includes_question_bank,
      includes_flashcards: product.includes_flashcards,
      validity_months: product.validity_months.toString(),
      is_active: product.is_active,
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this product mapping?')) {
      deleteMutation.mutate(id);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-green-600" />
            Learning System Product Mapping
          </h1>
          <p className="text-gray-600 mt-1">
            Configure WooCommerce product mappings for Learning System EN/AR packages
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          disabled={showAddForm}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product Mapping
        </Button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Map WooCommerce product IDs to language (EN or AR)</li>
          <li>• When a user purchases a product, they get access to that language version</li>
          <li>• Configure which features are included (Question Bank, Flashcards)</li>
          <li>• Set validity period (default: 12 months)</li>
          <li>• Only active mappings will be processed by the webhook</li>
        </ul>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Add New Product Mapping</h2>
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={createMutation.isPending}
          />
        </div>
      )}

      {/* Products List */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : products && products.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WooCommerce Product ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Includes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  {editingId === product.id ? (
                    <td colSpan={7} className="px-6 py-4">
                      <ProductForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        isSaving={updateMutation.isPending}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Package className="w-5 h-5 text-gray-400 mr-2" />
                          <span className="text-sm font-mono text-gray-900">
                            {product.woocommerce_product_id}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.language === 'EN'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {product.language}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {product.includes_question_bank && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              Question Bank
                            </span>
                          )}
                          {product.includes_flashcards && (
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              Flashcards
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.validity_months} months
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              id: product.id,
                              isActive: product.is_active,
                            })
                          }
                          disabled={toggleActiveMutation.isPending}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                            product.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {product.is_active ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No product mappings configured yet.</p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Mapping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Product Form Component
function ProductForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  isSaving,
}: {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          WooCommerce Product ID *
        </label>
        <input
          type="number"
          value={formData.woocommerce_product_id}
          onChange={(e) =>
            setFormData({ ...formData, woocommerce_product_id: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="e.g., 12345"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Language *
        </label>
        <select
          value={formData.language}
          onChange={(e) =>
            setFormData({ ...formData, language: e.target.value as 'EN' | 'AR' })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="EN">English (EN)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Validity Period (months) *
        </label>
        <input
          type="number"
          value={formData.validity_months}
          onChange={(e) => setFormData({ ...formData, validity_months: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="12"
          required
        />
      </div>

      <div className="flex items-center space-y-2 pt-6">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </div>

      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Included Features
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.includes_question_bank}
              onChange={(e) =>
                setFormData({ ...formData, includes_question_bank: e.target.checked })
              }
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Include Question Bank</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.includes_flashcards}
              onChange={(e) =>
                setFormData({ ...formData, includes_flashcards: e.target.checked })
              }
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Include Flashcards</span>
          </label>
        </div>
      </div>

      <div className="col-span-2 flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={
            isSaving ||
            !formData.woocommerce_product_id ||
            !formData.validity_months
          }
          className="bg-green-600 hover:bg-green-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
