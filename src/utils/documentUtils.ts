
import { supabase } from "@/integrations/supabase/client";

/**
 * Set up document storage for the user
 */
export const setupDocumentStorage = async () => {
  try {
    console.log("Setting up document storage");
    
    // Check if user-content bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
      
    if (bucketsError) {
      console.error("Error listing buckets:", bucketsError);
      return { success: false, error: "Failed to check storage buckets" };
    }
    
    // Create the bucket if it doesn't exist
    const userContentBucket = buckets?.find(b => b.name === 'user-content');
    
    if (!userContentBucket) {
      console.log("Creating user-content bucket");
      const { error: createError } = await supabase
        .storage
        .createBucket('user-content', {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        });
        
      if (createError) {
        console.error("Error creating bucket:", createError);
        return { success: false, error: "Failed to create storage bucket" };
      }
      
      console.log("User-content bucket created successfully");
    } else {
      console.log("User-content bucket already exists");
    }
    
    return {
      success: true,
      message: "Document storage ready",
      bucket: userContentBucket ? "user-content bucket already exists" : "user-content bucket created successfully"
    };
  } catch (error: any) {
    console.error("Setup document storage error:", error);
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
};

/**
 * Process a document after upload
 */
export const processDocument = async (filePath: string, documentId: string) => {
  try {
    console.log("Processing document:", documentId, "with file path:", filePath);

    // First update document status to processing
    const { error: updateError } = await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId);
      
    if (updateError) {
      console.error("Error updating document status:", updateError);
      throw new Error(`Failed to update document status: ${updateError.message}`);
    }

    // Download the file to extract content
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('user-content')
      .download(filePath);
      
    if (downloadError || !fileData) {
      console.error("Error downloading file:", downloadError);
      throw new Error(`Unable to download file: ${downloadError?.message || "Unknown error"}`);
    }

    // Create a mock document content entry 
    // In production this would be replaced with actual text extraction
    const { error: contentError } = await supabase
      .from("document_content")
      .insert({
        document_id: documentId,
        content: `This is extracted content from document ${documentId}. 
                In a real implementation, we would extract text from the file.
                File size: ${fileData.size} bytes.`,
        processing_status: "completed"
      });
      
    if (contentError) {
      console.error("Error creating document content:", contentError);
      throw new Error(`Failed to store document content: ${contentError.message}`);
    }

    // Mark document as completed
    const { error: finalUpdateError } = await supabase
      .from("documents")
      .update({ processing_status: "completed" })
      .eq("id", documentId);
      
    if (finalUpdateError) {
      console.error("Error updating document final status:", finalUpdateError);
      throw new Error(`Failed to update document status: ${finalUpdateError.message}`);
    }
    
    console.log("Document processed successfully");
    
    return { 
      success: true,
      message: "Document processed successfully",
      document_id: documentId
    };
  } catch (error: any) {
    console.error("Error processing document:", error);
    
    // Update document status to failed if there was an error
    await supabase
      .from("documents")
      .update({ 
        processing_status: "failed"
      })
      .eq("id", documentId);
    
    return { success: false, error: error.message || "An unexpected error occurred" };
  }
};
