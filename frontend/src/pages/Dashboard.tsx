import { useEffect, useState } from "react"
import { image } from "../common/type"
import Header from "../components/Header"
import { notify } from "../common/functions"
import labelImageService from "../services/image"
import ImageCard from "../components/ImageCard"
import { Link } from "react-router-dom"

const Dashboard: React.FC = () => {
    const [images, setImages] = useState<image[]>([])
    const [loading, setLoading] = useState<boolean>(true)
    const [lastEvaluatedKey, setLastEvaluatedKey] = useState<string | undefined>(undefined)
    const [canLoadMore, setCanLoadMore] = useState<boolean>(true)

    const fetchImages = async (lastEvaluatedKey?: string) => {
        try {
            setLoading(true)
            const response = await labelImageService.getImages(12, lastEvaluatedKey)
            console.log(response)

            setImages(prevImages => [...response?.data?.images, ...prevImages])

            setLastEvaluatedKey(response?.data?.lastKey)

            if (!response?.data?.lastKey) {
                setCanLoadMore(false)
            }
        } catch (error: any) {
            console.error(error)
            notify(error?.response?.data?.message || "Fail to load images", "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchImages()
    }, [])

    return (
        <div>
            <Header />

            <div className="w-full min-h-screen bg-base-300">
                <div className="flex flex-col justify-center py-16 max-w-7xl mx-auto">
                    <div className="flex flex-wrap items-center p-4 mb-16">
                        {images.length ? (
                            images.map((image, index) => (
                                <div key={index} className="lg:w-1/3 md:w-1/2 w-full">
                                    <div className="p-2">
                                        <ImageCard image={image} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-full text-center text-xl">{loading ? "Loading..." : "No images found"}</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-10 inset-x-0 w-full px-4">
                <div className="flex justify-around items-center max-w-3xl mx-auto bg-base-100 text-base-content py-4 shadow-xl rounded-full">
                    <button
                        onClick={() => fetchImages(lastEvaluatedKey)}
                        disabled={!canLoadMore || loading}
                        className="btn btn-outline btn-info">
                        {loading ? "Loading..." : (canLoadMore ? "Load More" : "No More Images")}
                    </button>
                    <Link to='/upload-images' className="btn btn-outline btn-accent">Upload images</Link>
                </div>
            </div>
        </div>
    )
}

export default Dashboard