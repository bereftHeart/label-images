import { toast } from "react-toastify";

export const notify = (
  message: string,
  status?: "info" | "success" | "warning" | "error",
) => {
  if (status) {
    toast[status](message, {
      position: "top-center",
    });
  } else {
    toast(message, {
      position: "top-center",
    });
  }
};

// Convert image to WebP & Base64
export const convertAndEncodeImage = async (file: File) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              const reader = new FileReader();
              reader.readAsDataURL(blob as Blob);
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
            },
            "image/webp",
            1,
          );
        } else {
          reject("Failed to convert image");
        }
      };
    };
  });
};
