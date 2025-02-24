import { useState } from "react";
import { notify } from "../common/functions";
import labelImageService from "../services/image";

const BulkUpload: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(newFiles);
      setPreviewImages(newFiles.map((file) => URL.createObjectURL(file)));
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      notify("No images selected!", "warning");
      return;
    }

    try {
      setUploading(true);
      await labelImageService.uploadImages(selectedFiles);
      notify("Images uploaded successfully!", "success");

      setSelectedFiles([]);
      setPreviewImages([]);
    } catch (error: any) {
      console.error(error);
      notify(error?.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-base-300">
      <div className="flex flex-col justify-center gap-8 items-center h-full py-16 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Upload Multiple Images</h2>

        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full max-w-xs"
        />

        {/* Image Previews */}
        <div className="flex flex-wrap gap-4 mt-6 max-w-2xl">
          {previewImages.map((src, index) => (
            <div key={index} className="relative w-24 h-24">
              <img
                src={src}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg shadow"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleUpload}
          disabled={!selectedFiles.length || uploading}
          className="btn btn-outline btn-accent mt-6"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
};

export default BulkUpload;
