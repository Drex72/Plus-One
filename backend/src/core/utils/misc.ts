import crypto from 'crypto';

export const generateRandStr = (len: number) => {
    return crypto.randomBytes(len / 2).toString('hex');
};

export const computeExpiryDate = (timeInSeconds: number) => {
    return new Date(Date.now() + timeInSeconds * 1000);
};

export const isDateExpired = (date: Date) => {
    return date <= new Date(Date.now());
};

export const computDateFromEpoch = (epochTime: number) => {
    return new Date(epochTime * 1000);
};
