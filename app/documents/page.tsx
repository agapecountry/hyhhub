'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Download } from 'lucide-react';

export default function DocumentsPage() {
  const downloadDocument = async (filename: string) => {
    try {
      const response = await fetch(`/api/documents/${filename}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Security Documents</h1>
          <p className="text-slate-600">Download security policy documents for Plaid integration</p>
        </div>

        <div className="grid gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Plaid Security Summary</CardTitle>
                    <CardDescription>
                      Quick reference document with concise answers to common Plaid security questions.
                      Perfect for initial submission.
                    </CardDescription>
                    <div className="mt-3 flex items-center space-x-4 text-sm text-slate-500">
                      <span>9.7 KB</span>
                      <span>•</span>
                      <span>Markdown format</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => downloadDocument('PLAID_SECURITY_SUMMARY.md')}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Summary
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">Complete Information Security Policy</CardTitle>
                    <CardDescription>
                      Comprehensive security policy document covering all aspects of data protection,
                      access controls, incident response, and compliance.
                    </CardDescription>
                    <div className="mt-3 flex items-center space-x-4 text-sm text-slate-500">
                      <span>29 KB</span>
                      <span>•</span>
                      <span>Markdown format</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => downloadDocument('INFORMATION_SECURITY_POLICY.md')}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Full Policy
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">Recommendation for Plaid Submission</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <p>
                <strong>Start with:</strong> PLAID_SECURITY_SUMMARY.md - This concise document directly
                answers Plaid&apos;s most common security questions.
              </p>
              <p>
                <strong>If requested:</strong> Provide INFORMATION_SECURITY_POLICY.md for complete
                details on your security program, controls, and procedures.
              </p>
              <p className="text-slate-600 mt-4">
                Both documents are in Markdown format. If Plaid requires PDF, you can convert them using
                any markdown-to-PDF tool or paste the content into a word processor.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
