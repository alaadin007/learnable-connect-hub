
// Add this to your imports at the top of the file
import { isDataResponse, isValidFileItem } from "@/utils/supabaseHelpers";

// Define the FileItem type to match the file item structure
type FileItem = {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: string;
  storage_path: string;
  processing_status: string;
};

// Assuming the fetchFiles function in the component looks like:
const fetchFiles = async () => {
  try {
    setLoading(true);
    setError(null);

    // Fetch the user's files
    const response = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user?.id as any)
      .order('created_at', { ascending: false });

    if (!isDataResponse(response)) {
      console.error("Error fetching files:", response.error);
      setError("Failed to load your files");
      return;
    }

    // Process the data safely using the helper function
    const validFiles: FileItem[] = response.data
      .filter(isValidFileItem)
      .map(item => ({
        id: item.id,
        filename: item.filename,
        file_type: item.file_type,
        file_size: item.file_size,
        created_at: item.created_at,
        storage_path: item.storage_path,
        processing_status: item.processing_status
      }));

    setFiles(validFiles);
  } catch (error) {
    console.error("Error fetching files:", error);
    setError("An unexpected error occurred while loading your files");
  } finally {
    setLoading(false);
  }
};
