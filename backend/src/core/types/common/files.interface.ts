export interface RequestFileContents {
    name: string;
    data: Buffer;
    size: number;
    encoding: string;
    tempFilePath: string;
    truncated: boolean;
    mimetype: string;
    md5: string;
    mv(path: string, callback: (err: any) => void): void;
    mv(path: string): Promise<void>;
}

export type FileObject = RequestFileContents | RequestFileContents[];

export type FileObjects = Record<string, FileObject>;
