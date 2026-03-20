import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { UploadCloud, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';

const Upload = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState(null);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files).filter(
            file => file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
        );
        setFiles(prev => [...prev, ...droppedFiles]);
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selectedFiles]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setProgress(0);
        setStatus(null);

        let totalSummary = { TotalReceived: 0, Ingested: 0, Ignored: 0, BySource: {}, BySentiment: {} };
        let hasError = false;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('files', file);

            try {
                const res = await axios.post('/api/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (progressEvent) => {
                        const filePercent = (progressEvent.loaded / progressEvent.total) * 100;
                        const overallProgress = Math.round(((i * 100) + filePercent) / files.length);
                        setProgress(overallProgress);
                    }
                });

                const sum = res.data.summary;
                if (sum) {
                    totalSummary.TotalReceived += sum.TotalReceived || 0;
                    totalSummary.Ingested += sum.Ingested || 0;
                    totalSummary.Ignored += sum.Ignored || 0;

                    for (const [key, value] of Object.entries(sum.BySource || {})) {
                        totalSummary.BySource[key] = (totalSummary.BySource[key] || 0) + value;
                    }
                    for (const [key, value] of Object.entries(sum.BySentiment || {})) {
                        totalSummary.BySentiment[key] = (totalSummary.BySentiment[key] || 0) + value;
                    }
                }
            } catch (err) {
                console.error(err);
                setStatus({ type: 'error', message: `Error processing ${file.name}: ${err.response?.data?.error || err.message}` });
                hasError = true;
                break;
            }
        }

        if (!hasError) {
            setStatus({ type: 'success', summary: totalSummary, message: `Successfully processed ${files.length} file(s).` });
            setFiles([]);
        }

        setUploading(false);
        setProgress(100);
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar bg-soft-bg">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-soft-fg tracking-tight mb-2">Upload Complaint Data</h2>
                <p className="text-soft-muted">Upload `.csv` or `.xlsx` files containing customer complaints from your data sources.</p>
            </div>

            {status && (
                <div className={`p-6 rounded-2xl ${status.type === 'success' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center mb-4">
                        {status.type === 'success' ? (
                            <CheckCircle className="w-6 h-6 mr-3 text-emerald-600 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-6 h-6 mr-3 text-red-600 flex-shrink-0" />
                        )}
                        <h3 className={`text-lg font-bold ${status.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>
                            {status.message}
                        </h3>
                    </div>
                    {status.type === 'success' && status.summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-soft-bg p-4 rounded-xl shadow-extruded-sm">
                                <p className="text-sm font-semibold text-soft-muted uppercase tracking-wide">Total Rows Received</p>
                                <p className="text-3xl font-bold text-soft-fg mt-1">{status.summary.TotalReceived}</p>
                            </div>
                            <div className="bg-soft-bg p-4 rounded-xl shadow-extruded-sm">
                                <p className="text-sm font-semibold text-soft-muted uppercase tracking-wide">Successfully Ingested</p>
                                <p className="text-3xl font-bold text-emerald-600 mt-1">{status.summary.Ingested}</p>
                            </div>
                            <div className="bg-soft-bg p-4 rounded-xl shadow-extruded-sm">
                                <p className="text-sm font-semibold text-soft-muted uppercase tracking-wide">Ignored / No Complaint</p>
                                <p className="text-3xl font-bold text-amber-500 mt-1">{status.summary.Ignored}</p>
                            </div>
                            {Object.keys(status.summary.BySource || {}).length > 0 && (
                                <div className="bg-soft-bg p-4 rounded-xl shadow-extruded-sm md:col-span-3 mt-2">
                                    <p className="text-sm font-semibold text-soft-muted uppercase tracking-wide mb-3">Ingestion Breakdown by Sheet / Source</p>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(status.summary.BySource).map(([src, count]) => (
                                            <span key={src} className="px-3 py-1.5 bg-soft-accent/10 text-soft-accent text-sm font-semibold rounded-lg">
                                                {src}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-soft-bg rounded-2xl shadow-extruded overflow-hidden">
                <div className="p-8">

                    <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all group relative ${files.length > 0 ? 'border-soft-accent/40 shadow-inset' : 'border-soft-muted/30 hover:border-soft-accent/50 hover:shadow-inset'}`}
                    >
                        <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            accept=".csv,.xlsx,.xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 rounded-full shadow-inset flex items-center justify-center mb-4 group-hover:scale-110 transition-transform bg-soft-bg">
                            <UploadCloud className="w-8 h-8 text-soft-accent" />
                        </div>
                        <h4 className="text-lg font-bold text-soft-fg mb-1">Drag and drop files here</h4>
                        <p className="text-soft-muted text-sm mb-6">Support for single or bulk upload. Max size 50MB per file.</p>
                        <button className="btn-neumorphic pointer-events-none">
                            Browse Files
                        </button>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-sm font-bold text-soft-fg mb-4 tracking-wide uppercase">Selected Files ({files.length})</h4>
                            <ul className="space-y-3">
                                {files.map((file, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-4 rounded-xl bg-soft-bg shadow-extruded-sm hover:shadow-inset transition-all">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shadow-inset-sm">
                                                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-soft-fg">{file.name}</p>
                                                <p className="text-xs text-soft-muted">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-2 rounded-lg text-soft-muted hover:bg-red-50 hover:text-red-500 transition-colors"
                                            disabled={uploading}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {uploading && (
                        <div className="mt-8 space-y-2">
                            <div className="flex justify-between text-sm font-semibold text-soft-fg">
                                <span>Processing...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-soft-bg shadow-inset rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-soft-accent h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 border-t border-soft-muted/10 bg-soft-bg flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center transition-all ${files.length > 0 && !uploading
                            ? 'btn-neumorphic btn-primary hover:-translate-y-0.5'
                            : 'bg-soft-bg shadow-inset text-soft-muted cursor-not-allowed'
                            }`}
                    >
                        {uploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                Analyzing Data...
                            </>
                        ) : 'Upload & Analyze Data'}
                    </button>
                </div>
            </div>
        </div>
        </div>
    );
};

export default Upload;
