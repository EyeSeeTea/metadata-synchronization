export type AttachedFile = {
    id: string;
    name: string;
    url: string;
};

export interface AttachedFileInput {
    name: string;
    data: Blob;
}
