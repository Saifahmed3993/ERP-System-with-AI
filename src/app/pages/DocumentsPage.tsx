import { useEffect, useState } from 'react';
import { DataTable, FormDialog, PageHeader, StatusBadge } from '../../shared/components/ui';
import { api } from '../../infrastructure/api/apiClient';
import { formatDate } from '../../infrastructure/api/formatters';

export function DocumentsPage({ notify }: { notify: (m: string) => void }) {
  const [dialog, setDialog] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [docRes, empRes] = await Promise.all([
        api.get<any>('/documents'),
        api.get<any>('/employees'),
      ]);
      setDocuments(Array.isArray(docRes) ? docRes : docRes.items || []);
      setEmployees((empRes.items || empRes || []).map((e: any) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` })));
    } catch (err) {
      notify('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
      notify('Document deleted successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete document');
    }
  };

  const handleDownload = async (row: any) => {
    try {
      await api.download(`/documents/${row._rawId}/download`, row.fileName || 'document');
    } catch (err: any) {
      notify(err.message || 'Failed to download document.');
    }
  };

  const handleUpload = async (data: Record<string, string>) => {
    try {
      const formData = new FormData();
      formData.append('title', data['Title']);
      formData.append('employeeId', data['Employee']);
      formData.append('category', data['Category']);
      if (data['Expiration Date']) formData.append('expirationDate', data['Expiration Date']);

      const fileInput = document.getElementById('doc-file-input') as HTMLInputElement | null;
      const file = fileInput?.files?.[0];
      if (!file) throw new Error('Choose a file before uploading.');
      if (file.size > 10 * 1024 * 1024) throw new Error('The file is too large. Maximum size is 10 MB.');
      formData.append('file', file);

      await api.upload('/documents', formData);
      setDialog(false);
      notify('Document uploaded successfully.');
      loadData();
    } catch (err: any) {
      notify(err.message || 'Failed to upload document.');
    }
  };

  const rows = documents.map(d => ({
    title: <b>{d.title}</b>,
    employee: d.employeeName,
    category: d.category,
    fileName: d.fileName,
    expiration: d.expirationDate ? formatDate(d.expirationDate) : 'Never',
    status: <StatusBadge status={d.status} />,
    _rawId: d.id
  }));

  const categoryOptions = [
    { value: 'Contract', label: 'Contract' },
    { value: 'Identity', label: 'Identity / National ID' },
    { value: 'Education', label: 'Education / Certificate' },
    { value: 'Legal', label: 'Legal / NDA' },
    { value: 'Medical', label: 'Medical Records' },
    { value: 'Other', label: 'Other Documents' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Human resources"
        title="Documents"
        description="Manage employee records, contracts, and compliance documents. Upload PDF, Office, image, or text files up to 10 MB."
        action={
          <button className="primary-button" onClick={() => setDialog(true)}>
            <i className="bi bi-cloud-arrow-up" /> Upload Document
          </button>
        }
      />
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center' }}>Loading documents...</div>
      ) : (
        <DataTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'employee', label: 'Employee' },
            { key: 'category', label: 'Category' },
            { key: 'fileName', label: 'File Name' },
            { key: 'expiration', label: 'Expiration' },
            { key: 'status', label: 'Status' },
          ]}
          rows={rows}
          actions={[
            { label: 'Download', icon: 'download', onClick: handleDownload },
            { label: 'Delete', icon: 'trash', color: 'var(--danger)', onClick: (r: any) => handleDelete(r._rawId) },
          ]}
        />
      )}
      {dialog && (
        <FormDialog
          title="Upload Document"
          close={() => setDialog(false)}
          submit={handleUpload}
          fields={[
            { label: 'Title', required: true },
            { label: 'Employee', type: 'select', options: employees, required: true },
            { label: 'Category', type: 'select', options: categoryOptions, required: true },
            { label: 'Expiration Date', type: 'date' },
            { label: 'File', type: 'file', required: true, accept: '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt', helpText: 'Required · PDF, Word, Excel, PNG, JPG, or TXT · maximum 10 MB.' },
          ]}
        />
      )}
    </>
  );
}
