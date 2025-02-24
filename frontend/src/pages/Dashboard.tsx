import { useContext, useEffect, useState } from "react";
import { image } from "../common/type";
import Header from "../components/Header";
import { notify } from "../common/functions";
import labelImageService from "../services/image";
import ImageCard from "../components/ImageCard";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const Dashboard: React.FC = () => {
  const auth = useContext(AuthContext);
  const [images, setImages] = useState<image[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [canLoadMore, setCanLoadMore] = useState<boolean>(true);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | undefined>(
    undefined,
  );
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const navigate = useNavigate();

  //   Load images
  const fetchImages = async (lastEvaluatedKey?: string) => {
    try {
      setLoading(true);
      const response = await labelImageService.getImages(12, lastEvaluatedKey);

      setImages((prevImages) =>
        [...prevImages, ...(response?.data?.images ?? [])].sort((a, b) =>
          (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
        ),
      );

      setLastEvaluatedKey(response?.data?.lastKey);
      if (!response?.data?.lastKey) {
        setCanLoadMore(false);
      }
    } catch (error: any) {
      console.error(error);
      notify(error?.response?.data?.message || "Fail to load images", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  //   Select images to delete
  const toggleSelectImage = (id: string) => {
    setSelectedImages((prev) =>
      prev.includes(id)
        ? prev.filter((imageId) => imageId !== id)
        : [...prev, id],
    );
  };

  //   Delete images
  const handleBulkDelete = async () => {
    if (!selectedImages.length) {
      notify("No images selected for deletion", "warning");
      return;
    }

    if (!auth?.user) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      await labelImageService.bulkDeleteImages(selectedImages);
      setImages((prevImages) =>
        prevImages.filter((img) => !selectedImages.includes(img.id)),
      );
      setSelectedImages([]);
      notify("Selected images deleted successfully!", "success");
    } catch (error: any) {
      console.error(error);
      notify(
        error?.response?.data?.message || "Failed to delete images",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />

      <div className="w-full min-h-screen bg-base-300">
        <div className="flex flex-col justify-center py-16 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center p-4 mb-16">
            {images.length ? (
              images.map((image) => (
                <div key={image.id} className="lg:w-1/3 md:w-1/2 w-full">
                  <div className="p-2">
                    <label className="label relative cursor-pointer">
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={selectedImages.includes(image.id)}
                        onChange={() => toggleSelectImage(image.id)}
                      />
                      <ImageCard
                        image={image}
                        className={`w-full hover:-mt-2 transition-all duration-200 ease-linear ${
                          selectedImages.includes(image.id) ? "opacity-60" : ""
                        }`}
                      />
                      {selectedImages.includes(image.id) && (
                        <div className="badge absolute -top-2 -right-2 badge-error gap-2 text-white">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            className="inline-block h-4 w-4 stroke-current"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            ></path>
                          </svg>
                          Delete
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full h-full text-center text-xl">
                {loading ? (
                  <span className="loading loading-spinner text-accent"></span>
                ) : (
                  "No images found"
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-10 inset-x-0 w-full px-4">
        <div className="flex justify-around items-center max-w-3xl mx-auto bg-base-100 text-base-content py-4 shadow-xl rounded-full">
          <button
            onClick={() => fetchImages(lastEvaluatedKey)}
            disabled={!canLoadMore || loading}
            className="btn btn-outline btn-info"
          >
            {loading
              ? "Loading..."
              : canLoadMore
                ? "Load More"
                : "No More Images"}
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={!selectedImages.length || loading}
            className="btn btn-outline btn-error"
          >
            {loading ? "Processing..." : `Delete (${selectedImages.length})`}
          </button>
          <Link to="/upload-image" className="btn btn-outline btn-accent">
            Upload images
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
