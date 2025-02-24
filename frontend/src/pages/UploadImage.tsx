import { useState } from "react";
import { Link } from "react-router-dom";
import { notify } from "../common/functions";
import labelImageService from "../services/image";

const UploadImage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [externalImageUrl, setExternalImageUrl] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [uploading, setUploading] = useState(false);


  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setExternalImageUrl("");
    }
  };

  // Handle upload
  const handleUpload = async () => {
    setUploading(true);
    try {
      if (file) {
        // Upload file
        await labelImageService.uploadImage(file, label);
      } else if (externalImageUrl) {
        // Upload external image
        await labelImageService.storeExternalImage(externalImageUrl, label);
      }

      notify("Image uploaded successfully", "success");

      setFile(null);
      setExternalImageUrl("");
      setLabel("");

    } catch (error: any) {
      console.error(error);
      notify(error?.response?.data?.message || "Fail to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full h-screen bg-base-300">
      <div className="flex flex-col md:flex-row justify-center gap-8 items-center h-full py-16 max-w-7xl mx-auto">
        {/* Review */}
        <div className="flex flex-col gap-4 justify-center items-center p-4 aspect-square border border-info rounded-md border-dashed">
          {file ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="w-80 h-80 object-cover"
            />
          ) : (
            <span className="text-info">Update your image to review</span>
          )}
          {externalImageUrl && (
            <img
              src={externalImageUrl}
              alt="preview"
              className="w-80 h-80 object-cover"
            />
          )}
        </div>
        {/* Upload file */}
        <div className="flex flex-col gap-4 justify-center items-center p-8 bg-base-200 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold w-full text-start">
            Upload an image
          </h2>

          <input
            type="file"
            accept="image/*"
            className="file-input file-input-bordered w-full max-w-xs"
            onChange={handleFileChange}
          />

          <h2 className="text-xl font-bold w-full text-start">
            Or paste an external url
          </h2>

          <input
            type="text"
            className="input input-bordered w-full max-w-xs"
            placeholder="Enter image url here..."
            onChange={(e) => {
              setExternalImageUrl(e.target.value);
              setFile(null);
            }}
          />

          <h2 className="w-full text-start">Please enter label (option)</h2>

          <input
            type="text"
            className="input input-bordered w-full max-w-xs"
            placeholder="Enter label here..."
            onChange={(e) => setLabel(e.target.value)}
          />

          <button
            className="w-32 mt-4 btn btn-outline btn-accent"
            disabled={uploading || (!file && !externalImageUrl)}
            onClick={handleUpload}
          >
            Upload
          </button>
          <Link to="/bulk-upload" className="text-info underline">
            Upload multiple file here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UploadImage;
