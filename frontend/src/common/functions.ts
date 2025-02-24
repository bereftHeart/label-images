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

// Convert image to WebP

export const convertImage = async (file: File) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  return new Promise<string>((resolve) => {
    reader.onload = () => {
      const img = new Image();
      img.src = reader.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) return resolve("");
            resolve(URL.createObjectURL(blob));
          },
          "image/webp",
          1,
        );
      };
    };
  });
};
