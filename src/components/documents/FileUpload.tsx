
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, File, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { insertDocument, hasData, safeCast } from "@/utils/supabaseTypeHelpers";

const FileUpload = ({ onUploadComplete }: { onUploadComplete?: () => void }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File is too large. Maximum size is 10MB.");
        return;
      }
      
      // Validate file type - allow PDF, txt, docx, doc
      const validTypes = ["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Invalid file type. Please upload PDF, TXT, or Word documents.");
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Generate a unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const storagePath = `uploads/${user.id}/${filePath}`;
      
      // Track upload progress manually
      const trackProgress = (progress: number) => {
        setUploadProgress(progress);
      };
      
      // Create a XMLHttpRequest to track progress
      let xhr = new XMLHttpRequest();
      
      // Define upload promise with progress tracking
      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            trackProgress(percent);
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP error ${xhr.status}`));
          }
        });
      });
      
      // Start the upload using Supabase
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);
        
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Create document record in the database using helper
      const docData = {
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        processing_status: "pending",
        user_id: user.id,
        school_id: null // Assuming this is optional
      };
      
      const docResponse = await insertDocument(docData);
        
      if (!hasData(docResponse) || !docResponse.data) {
        throw new Error(`Document record creation failed: ${docResponse.error?.message || "Unknown error"}`);
      }
      
      // Process the document
      if (docResponse.data.id) {
        // Call edge function to process the document
        const { error: processError } = await supabase.functions.invoke('process-document', {
          body: { documentId: docResponse.data.id }
        });
        
        if (processError) {
          console.warn("Document processing warning:", processError);
          // Continue despite warning - processing will happen asynchronously
        }
      }
      
      toast.success("Document uploaded successfully!");
      clearFile();
      
      if (onUploadComplete) {
        onUploadComplete();
      }
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Input
          type="file"
          accept=".pdf,.txt,.docx,.doc"
          onChange={handleFileChange}
          className="hidden"
          id="upload"
          ref={fileInputRef}
        />
        <Button variant="outline" asChild>
          <label htmlFor="upload" className="cursor-pointer flex items-center">
            <UploadCloud className="w-4 h-4 mr-2" />
            Choose File
          </label>
        </Button>
        {file && (
          <Button variant="destructive" size="icon" onClick={clearFile}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      {file && (
        <div className="flex items-center space-x-2">
          <File className="w-4 h-4 text-gray-500" />
          <p className="text-sm text-gray-700">{file.name}</p>
          <p className="text-xs text-gray-500">({(file.size / 1024).toFixed(2)} KB)</p>
        </div>
      )}
      {uploading && (
        <div className="relative pt-1">
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div
              style={{ width: `${uploadProgress}%` }}
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"
            ></div>
          </div>
          <p className="text-center text-xs text-gray-500">{uploadProgress}%</p>
        </div>
      )}
      <Button onClick={handleUpload} disabled={!file || uploading} className="gradient-bg">
        {uploading ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
};

export default FileUpload;
