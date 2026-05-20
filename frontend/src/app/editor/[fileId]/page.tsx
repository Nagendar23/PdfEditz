"use client";

import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getFilePreviewUrl } from "@/services/fileService";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const PdfViewer = dynamic(() => import("@/components/pdf/PdfViewer"), {
  ssr: false,
});

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const { token, isReady } = useAuth();

  const fileIdParam = Array.isArray(params.fileId)
    ? params.fileId[0]
    : params.fileId;

  const fileId = typeof fileIdParam === "string" ? fileIdParam : "";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!token) {
      router.replace("/login");
    }
  }, [isReady, token, router]);

  if (!fileId) {
    return <div>Invalid file</div>;
  }

  if (!isReady || !token) {
    return <div className="p-5">Loading authentication...</div>;
  }

  const fileObj = {
    url: getFilePreviewUrl(fileId),
    httpHeaders: {
      Authorization: `Bearer ${token}`,
    },
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-semibold">Editor Page</h1>
      <p className="text-sm text-slate-600">File ID: {fileId}</p>
      <div className="mt-4 border border-slate-200 bg-white shadow-sm">
        {fileObj ? (
          <PdfViewer fileUrl={fileObj} fileId={fileId} />
        ) : (
          <div>Loading PDF...</div>
        )}
      </div>
    </div>
  );
}