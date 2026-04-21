"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { getFilePreviewUrl } from "@/services/fileService";
import { useEffect, useState } from "react";

const PdfViewer = dynamic(() => import("@/components/pdf/PdfViewer"), {
  ssr: false,
});

export default function EditorPage() {
  const params = useParams();
  const [fileObj, setFileObj] = useState<any>(null);

  const fileIdParam = Array.isArray(params.fileId)
    ? params.fileId[0]
    : params.fileId;

  const fileId = typeof fileIdParam === "string" ? fileIdParam : "";

  useEffect(() => {
    if (fileId) {
      const token = localStorage.getItem("token") || "";
      setFileObj({
        url: getFilePreviewUrl(fileId),
        httpHeaders: {
          Authorization: "Bearer " + token,
        },
      });
    }
  }, [fileId]);

  if (!fileId) {
    return <div>Invalid file</div>;
  }

  return (
    <div className="p-5">
      <h1>Editor Page</h1>
      <p>File ID : {fileId}</p>
      <div className="mt-4 border">
        {fileObj ? (
          <PdfViewer fileUrl={fileObj} fileId={fileId} />
        ) : (
          <div>Loading PDF...</div>
        )}
      </div>
    </div>
  );
}