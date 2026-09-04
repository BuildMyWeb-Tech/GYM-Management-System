import ImageKit from "imagekit";

let imagekit;

function getImageKit() {
    if (!imagekit) {
        imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        });
    }
    return imagekit;
}

export default new Proxy({}, {
    get(_target, prop) {
        return getImageKit()[prop];
    },
});