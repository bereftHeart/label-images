import axios from "axios";

class LabelImageService {
  private readonly IMAGE_URL = `${import.meta.env.VITE_API_BASE_URL}/label-images`;
  private api = axios.create({
    baseURL: this.IMAGE_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  async getImages(limit: number, lastKey?: string) {
    return await this.api.get("/", { params: { limit, lastKey } });
  }

  async labelImage(id: string, label: string) {
    return await this.api.put("/", { id, label });
  }

  async uploadImage(file: File, label?: string) {
    const fileName = file.name;
    const contentType = file.type;

    // Get presigned URL
    const presignedResponse = await this.api.post("/upload", {
      fileName,
      contentType,
    });

    // Upload directly to S3 using presigned URL
    await axios.put(presignedResponse.data.uploadUrl, file, {
      headers: { "Content-Type": contentType },
    });

    // Confirm upload to server
    await this.api.post("/confirm-upload", {
      data: [
        {
          id: presignedResponse.data.id,
          fileName,
          s3Key: presignedResponse.data.s3Key,
          label
        }
      ]
    })
  }

  async uploadImages(files: File[]) {
    const images = files.map((file) => ({
      fileName: file.name,
      contentType: file.type,
    }));

    // Get presigned URLs for all images
    const response = await this.api.post("/bulk-upload", { images });
    const uploadUrls = response.data.uploadUrls;

    // Upload images to S3 using presigned URLs
    await Promise.all(
      files.map(async (file, index) => {
        await axios.put(uploadUrls[index], file, {
          headers: { "Content-Type": file.type },
        });
      }),
    );

    // Confirm upload to server
    await this.api.post("/confirm-upload", {
      data: response.data.map((item: any, index: number) => ({
        ...item,
        fileName: files[index].name,
      }))
    });
  }

  async storeExternalImage(imageUrl: string, label?: string) {
    return await this.api.post("/external", { imageUrl, label });
  }

  async bulkDeleteImages(ids: string[]) {
    return await this.api.post("/bulk-delete", { ids });
  }
}

const labelImageService = new LabelImageService();
export default labelImageService;
