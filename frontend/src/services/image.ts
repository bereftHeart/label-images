import axios from "axios";
import { convertAndEncodeImage } from "../common/functions";

class LabelImageService {
    private readonly IMAGE_URL = `${import.meta.env.VITE_API_BASE_URL}/label-images`;
    private api = axios.create({
        baseURL: this.IMAGE_URL,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
    });

    async getImages(limit: number, lastEvaluatedKey?: string) {
        return await this.api.get("/", { params: { limit, lastEvaluatedKey } });
    }

    async labelImage(id: string, label: string) {
        return await this.api.put("/", { id, label });
    }

    async uploadImage(file: File, label?: string) {
        const filename = file.name;
        const contentType = file.type;
        const base64Image = await convertAndEncodeImage(file);
        return await this.api.post("/upload", { filename, contentType, base64Image, label });
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