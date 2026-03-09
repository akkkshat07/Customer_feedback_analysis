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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight mb-2">Upload Complaint Data</h2>
                <p className="text-slate-500 dark:text-slate-400">Upload `.csv` or `.xlsx` files containing customer complaints from your data sources.</p>
            </div>

            {status && (
                <div className={`p-6 rounded-2xl border ${status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'}`}>
                    <div className="flex items-center mb-4">
                        {status.type === 'success' ? (
                            <CheckCircle className="w-6 h-6 mr-3 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-6 h-6 mr-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        <h3 className={`text-lg font-bold ${status.type === 'success' ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
                            {status.message}
                        </h3>
                    </div>
                    {status.type === 'success' && status.summary && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm">
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Rows Received</p>
                                <p className="text-3xl font-bold text-slate-800 dark:text-white mt-1">{status.summary.TotalReceived}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm">
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Successfully Ingested</p>
                                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{status.summary.Ingested}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm">
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Ignored / No Complaint</p>
                                <p className="text-3xl font-bold text-amber-500 dark:text-amber-400 mt-1">{status.summary.Ignored}</p>
                            </div>
                            {Object.keys(status.summary.BySource || {}).length > 0 && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-emerald-100 dark:border-slate-700 shadow-sm md:col-span-3 mt-2">
                                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">Ingestion Breakdown by Sheet / Source</p>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(status.summary.BySource).map(([src, count]) => (
                                            <span key={src} className="px-3 py-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-sm font-semibold rounded-lg border border-teal-100 dark:border-teal-800/50">
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

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="p-8">

                    <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-colors group relative ${files.length > 0 ? 'border-teal-300 dark:border-teal-700 bg-teal-50/30 dark:bg-teal-900/10' : 'border-gray-200 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-900/10'}`}
                    >
                        <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            accept=".csv,.xlsx,.xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Drag and drop files here</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Support for single or bulk upload. Max size 50MB per file.</p>
                        <button className="px-6 py-2.5 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold shadow-sm group-hover:bg-teal-600 group-hover:dark:bg-teal-500 group-hover:text-white group-hover:border-transparent transition-all pointer-events-none">
                            Browse Files
                        </button>
                    </div>

                    {files.length > 0 && (
                        <div className="mt-8">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 tracking-wide uppercase">Selected Files ({files.length})</h4>
                            <ul className="space-y-3">
                                {files.map((file, idx) => (
                                    <li key={idx} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{file.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
                            <div className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                                <span>Processing...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                    className="bg-teal-600 dark:bg-teal-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-8 py-5 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading}
                        className={`px-8 py-3 rounded-xl font-bold flex items-center transition-all ${files.length > 0 && !uploading
                            ? 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
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
