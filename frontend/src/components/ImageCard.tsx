import { useContext, useState } from "react";
import { image } from "../common/type";
import { AuthContext } from "../contexts/AuthContext";
import labelImageService from "../services/image";
import { useNavigate } from "react-router-dom";
import { notify } from "../common/functions";

const ImageCard: React.FC<{ image: image; className?: string }> = ({
  image,
  className = "",
}) => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [label, setLabel] = useState<string>(image.label);
  const [loading, setLoading] = useState<boolean>(false);

  const [updatedImage, setUpdatedImage] = useState<image>(image);

  const handleLabel = async () => {
    if (!auth?.user) navigate("/login");

    setLoading(true);
    try {
      const response = await labelImageService.labelImage(image.id, label);
      setUpdatedImage(response.data);

      notify("Image labeled successfully", "success");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`card card-compact bg-base-200 shadow-xl ${className}`}>
      <figure>
        <img
          className="w-full h-64 object-cover"
          src={updatedImage.url}
          alt={updatedImage.fileName}
        />
      </figure>
      <div className="card-body">
        <div>
          <p className="text-info">
            {`Uploaded (${new Date(
              updatedImage.createdAt,
            ).toLocaleString()}) by: `}
          </p>
          <p className="text-secondary">
            {updatedImage.createdBy ?? "Unknown"}
          </p>
        </div>

        <div>
          <p className="text-info">
            {`Updated (${
              updatedImage.updatedAt
                ? new Date(updatedImage.updatedAt).toLocaleString()
                : "N/A"
            }) by: `}
          </p>
          <p className="text-secondary">
            {updatedImage.updatedBy ?? "Unknown"}
          </p>
        </div>

        <a
          className="w-fit text-accent text-lg cursor-pointer hover:opacity-75"
          target="blank"
          href={updatedImage.url}
        >
          View full image
        </a>

        <div className="flex w-full justify-between items-center gap-2">
          <input
            type="text"
            placeholder={updatedImage.label ? "" : "Enter label here"}
            className="input input-bordered input-accent w-full"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            disabled={loading}
            className="btn btn-success"
            onClick={handleLabel}
          >
            Save label
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;
