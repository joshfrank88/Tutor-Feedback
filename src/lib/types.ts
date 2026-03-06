export type PlatformRecord = {
    humanities: boolean;
    intergreat: boolean;
    privateTutee: boolean;
    keystoneQuick: boolean;
};

export type StudentMetadata = {
    platforms: PlatformRecord;
    subject: string;
    rate: number;
};
